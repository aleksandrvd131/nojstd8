import {
  ProjectSession,
  ExecutionSnapshot,
  CallStackFrame,
  StateNodeData,
  OperationNodeData,
  SparseTape,
  TestCase,
  AlphabetConfig,
  EdgeRuleItem,
  operationRepeatCount,
} from '../types/turing';

export function tokenizeTapeInput(word: string, alphabet: AlphabetConfig): string[] {
  if (!word) return [];
  const knownTokens = [...alphabet.symbols, alphabet.blankSymbol]
    .filter((s) => s.length > 0)
    .sort((a, b) => b.length - a.length);

  const tokens: string[] = [];
  let i = 0;
  while (i < word.length) {
    const matched = knownTokens.find((tok) => tok.length > 1 && word.startsWith(tok, i));
    if (matched) {
      tokens.push(matched);
      i += matched.length;
    } else {
      tokens.push(word[i]);
      i += 1;
    }
  }
  return tokens;
}

const MAX_CYCLE_WINDOW = 256;

export function getConfigurationKey(state: RuntimeState, blank: string): string {
  const tapeEntries = Object.keys(state.tape)
    .map(Number)
    .filter((pos) => state.tape[pos] !== undefined && state.tape[pos] !== blank)
    .sort((a, b) => a - b)
    .map((pos) => `${pos}:${state.tape[pos]}`);
  const stackKey = state.callStack
    .map((f) => `${f.subMachineId}@${f.returnNodeId}:${f.repeatRemaining ?? 1}`)
    .join('>');
  return `${state.currentNodeId}|${state.headPosition}|${stackKey}|${tapeEntries.join(',')}`;
}

export interface RuntimeState {
  currentNodeId: string;
  headPosition: number;
  tape: SparseTape;
  stepCount: number;
  visitedPositions: number[];
  callStack: CallStackFrame[];
  history: ExecutionSnapshot[];
  recentConfigs?: string[];
  status: 'idle' | 'running' | 'paused' | 'halted' | 'error';
  statusMessage?: string;
  activeEdgeId?: string;
  activeRuleId?: string;
}

/**
 * Initialize runtime state from project configuration
 */
export function initRuntimeState(
  session: ProjectSession,
  customInputString?: string,
  customHeadPos?: number
): RuntimeState {
  let initialTape: SparseTape = { ...session.initialTape };
  const nonBlankPositions = Object.entries(initialTape)
    .filter(([, symbol]) => symbol !== session.alphabet.blankSymbol)
    .map(([position]) => Number(position))
    .filter(Number.isFinite);
  const defaultHeadPosition = nonBlankPositions.length ? Math.max(...nonBlankPositions) + 1 : 0;
  const headPosition =
    customHeadPos !== undefined
      ? customHeadPos
      : customInputString !== undefined
      ? tokenizeTapeInput(customInputString, session.alphabet).length
      : session.initialHeadPositionExplicit || session.initialHeadPosition !== 0
      ? session.initialHeadPosition ?? defaultHeadPosition
      : defaultHeadPosition;

  if (customInputString !== undefined) {
    initialTape = {};
    const tokens = tokenizeTapeInput(customInputString, session.alphabet);
    for (let i = 0; i < tokens.length; i++) {
      initialTape[i] = tokens[i];
    }
  }

  // Find start node
  let startNodeId = '';
  if (session.mode === '5-tuple' || session.subMode === 'state-graph') {
    const startNode = session.nodes.find(
      (n) => (n.data as StateNodeData).stateType === 'initial'
    );
    startNodeId = startNode ? startNode.id : (session.nodes[0]?.id || '');
  } else {
    const startNode = session.nodes.find(
      (n) => (n.data as OperationNodeData).opType === 'START'
    );
    startNodeId = startNode ? startNode.id : (session.nodes[0]?.id || '');
  }

  const initialState: RuntimeState = {
    currentNodeId: startNodeId,
    headPosition,
    tape: initialTape,
    stepCount: 0,
    visitedPositions: [headPosition],
    callStack: [],
    history: [],
    status: startNodeId ? 'idle' : 'error',
    statusMessage: startNodeId ? 'Готов к запуску' : 'Не найден начальный узел (START)',
  };
  if (startNodeId) {
    initialState.recentConfigs = [getConfigurationKey(initialState, session.alphabet.blankSymbol)];
  }
  return initialState;
}

export function stepMachine(
  session: ProjectSession,
  state: RuntimeState
): RuntimeState {
  const nextState = stepMachineCore(session, state);
  if (nextState.status !== 'running') {
    return nextState;
  }

  const prevConfigs = state.recentConfigs ?? [];
  const nextKey = getConfigurationKey(nextState, session.alphabet.blankSymbol);
  if (prevConfigs.includes(nextKey)) {
    return {
      ...nextState,
      status: 'error',
      statusMessage: `Обнаружено зацикливание (повтор конфигурации на такте ${nextState.stepCount}).`,
    };
  }

  const updatedConfigs = [...prevConfigs, nextKey];
  if (updatedConfigs.length > MAX_CYCLE_WINDOW) {
    updatedConfigs.shift();
  }

  return {
    ...nextState,
    recentConfigs: updatedConfigs,
  };
}

function stepMachineCore(
  session: ProjectSession,
  state: RuntimeState
): RuntimeState {
  if (state.status === 'halted' || state.status === 'error') {
    return state;
  }

  const { mode, subMode, alphabet, rules5, rules4, nodes, edges, subMachines } = session;
  const blank = alphabet.blankSymbol;
  const currentSymbol = state.tape[state.headPosition] ?? blank;

  // Save snapshot for Undo (Step Back)
  const snapshot: ExecutionSnapshot = {
    currentNodeId: state.currentNodeId,
    headPosition: state.headPosition,
    tape: { ...state.tape },
    stepCount: state.stepCount,
    visitedPositions: [...state.visitedPositions],
    callStack: [...state.callStack],
  };

  const nextHistory = [...state.history, snapshot];
  // Limit history length to prevent memory leaks (e.g. 500 steps)
  if (nextHistory.length > 500) {
    nextHistory.shift();
  }

  // Resolve active scope (submachine if callStack is non-empty, otherwise session root)
  let activeNodes = nodes;
  let activeEdges = edges;
  let activeRules4 = rules4;
  let activeSubMachineName = '';

  if (state.callStack.length > 0) {
    const topFrame = state.callStack[state.callStack.length - 1];
    const subMachine = subMachines?.find((sm) => sm.id === topFrame.subMachineId);
    if (subMachine) {
      activeNodes = subMachine.nodes;
      activeEdges = subMachine.edges;
      activeRules4 = subMachine.rules4 || [];
      activeSubMachineName = subMachine.name;
    }
  }

  // Look up currentNode in activeNodes, with fallback to root session and all submachines
  let currentNode = activeNodes.find((n) => n.id === state.currentNodeId);
  if (!currentNode) {
    currentNode = nodes.find((n) => n.id === state.currentNodeId);
    if (currentNode) {
      activeNodes = nodes;
      activeEdges = edges;
      activeRules4 = rules4;
    } else {
      for (const sm of (subMachines || [])) {
        const found = sm.nodes.find((n) => n.id === state.currentNodeId);
        if (found) {
          currentNode = found;
          activeNodes = sm.nodes;
          activeEdges = sm.edges;
          activeRules4 = sm.rules4 || [];
          activeSubMachineName = sm.name;
          break;
        }
      }
    }
  }

  if (!currentNode) {
    return {
      ...state,
      status: 'error',
      statusMessage: `Текущее состояние '${state.currentNodeId}' не найдено на диаграмме${activeSubMachineName ? ` (подмашина '${activeSubMachineName}')` : ''}.`,
    };
  }

  // --- 1. MODE: 5-TUPLE ---
  if (mode === '5-tuple') {
    const stateData = currentNode.data as StateNodeData;
    if (stateData.stateType === 'halt' || stateData.stateType === 'accept' || stateData.stateType === 'reject') {
      return {
        ...state,
        status: 'halted',
        statusMessage: `Останов в конечном состоянии ${stateData.label} (${stateData.stateType}).`,
      };
    }

    // Find rule: currentState & readSymbol
    const rule = rules5.find(
      (r) => r.fromState === state.currentNodeId && r.readSymbol === currentSymbol
    );

    if (!rule) {
      return {
        ...state,
        status: 'halted',
        statusMessage: `Останов: нет правила для состояния '${stateData.label}' и символа '${currentSymbol}'.`,
      };
    }

    // Apply rule
    const newTape = { ...state.tape };
    newTape[state.headPosition] = rule.writeSymbol;

    let newHead = state.headPosition;
    if (rule.move === 'L') newHead -= 1;
    else if (rule.move === 'R') newHead += 1;

    const newVisited = state.visitedPositions.includes(newHead)
      ? state.visitedPositions
      : [...state.visitedPositions, newHead];

    // Find edge connecting fromState and toState
    const activeEdge = activeEdges.find(
      (e) => e.source === rule.fromState && e.target === rule.toState
    );

    const targetNode = activeNodes.find((n) => n.id === rule.toState);
    const targetData = targetNode?.data as StateNodeData | undefined;
    const isHalted =
      targetData?.stateType === 'halt' ||
      targetData?.stateType === 'accept' ||
      targetData?.stateType === 'reject';

    return {
      ...state,
      currentNodeId: rule.toState,
      headPosition: newHead,
      tape: newTape,
      stepCount: state.stepCount + 1,
      visitedPositions: newVisited,
      history: nextHistory,
      activeEdgeId: activeEdge?.id,
      activeRuleId: rule.id,
      status: isHalted ? 'halted' : 'running',
      statusMessage: isHalted
        ? `Достигнуто состояние останова ${targetData?.label}.`
        : `Шаг ${state.stepCount + 1}: ${rule.fromState} (${currentSymbol} -> ${rule.writeSymbol}, ${rule.move}) -> ${rule.toState}`,
    };
  }

  // --- 2. MODE: 4-TUPLE (State Graph) ---
  if (mode === '4-tuple' && subMode === 'state-graph') {
    const stateData = currentNode.data as StateNodeData;
    if (stateData.stateType === 'halt' || stateData.stateType === 'accept' || stateData.stateType === 'reject') {
      return {
        ...state,
        status: 'halted',
        statusMessage: `Останов в конечном состоянии ${stateData.label}.`,
      };
    }

    const rule = activeRules4.find(
      (r) => r.fromState === state.currentNodeId && r.readSymbol === currentSymbol
    );

    if (!rule) {
      return {
        ...state,
        status: 'halted',
        statusMessage: `Останов: нет правила для состояния '${stateData.label}' и символа '${currentSymbol}'.`,
      };
    }

    const newTape = { ...state.tape };
    let newHead = state.headPosition;

    if (rule.command === 'L') {
      newHead -= 1;
    } else if (rule.command === 'R') {
      newHead += 1;
    } else if (rule.command === 'N') {
      // Do nothing to tape, stay on cell
    } else {
      // Command is write symbol
      newTape[state.headPosition] = rule.command;
    }

    const newVisited = state.visitedPositions.includes(newHead)
      ? state.visitedPositions
      : [...state.visitedPositions, newHead];

    const activeEdge = activeEdges.find(
      (e) => e.source === rule.fromState && e.target === rule.toState
    );

    const targetNode = activeNodes.find((n) => n.id === rule.toState);
    const targetData = targetNode?.data as StateNodeData | undefined;
    const isHalted =
      targetData?.stateType === 'halt' ||
      targetData?.stateType === 'accept' ||
      targetData?.stateType === 'reject';

    return {
      ...state,
      currentNodeId: rule.toState,
      headPosition: newHead,
      tape: newTape,
      stepCount: state.stepCount + 1,
      visitedPositions: newVisited,
      history: nextHistory,
      activeEdgeId: activeEdge?.id,
      activeRuleId: rule.id,
      status: isHalted ? 'halted' : 'running',
      statusMessage: isHalted
        ? `Достигнуто состояние останова ${targetData?.label}.`
        : `Шаг ${state.stepCount + 1}: ${rule.fromState} [${currentSymbol} : ${rule.command}] -> ${rule.toState}`,
    };
  }

  // --- 3. MODE: 4-TUPLE (Operational Diagram VTM style) ---
  const opData = currentNode.data as OperationNodeData;

  // A. Check for FINISH
  if (opData.opType === 'FINISH') {
    // If call stack is not empty, return from submachine!
    if (state.callStack.length > 0) {
      const topFrame = state.callStack[state.callStack.length - 1];
      if ((topFrame.repeatRemaining ?? 1) > 1) {
        const machine = subMachines.find(sm => sm.id === topFrame.subMachineId);
        const start = machine?.nodes.find(n => (n.data as OperationNodeData).opType === 'START');
        if (!start) return { ...state, status: 'error', statusMessage: 'Не найден START подмашины.' };
        return {
          ...state, currentNodeId: start.id,
          callStack: [...state.callStack.slice(0, -1), { ...topFrame, repeatRemaining: topFrame.repeatRemaining! - 1 }],
          stepCount: state.stepCount + 1, history: nextHistory, status: 'running',
        };
      }
      const remainingStack = state.callStack.slice(0, -1);
      return {
        ...state,
        currentNodeId: topFrame.returnNodeId,
        callStack: remainingStack,
        stepCount: state.stepCount + 1,
        history: nextHistory,
        status: 'running',
        statusMessage: `Возврат из подмашины '${topFrame.subMachineName}' в узел '${topFrame.returnNodeId}'.`,
      };
    }
    return {
      ...state,
      status: 'halted',
      statusMessage: 'Программа успешно завершена (узел FINISH).',
    };
  }

  // B. Perform Node Operation
  const newTape = { ...state.tape };
  let newHead = state.headPosition;
  const scannedPositions: number[] = [];
  const repeat = opData.opType === 'START' ? 1 : operationRepeatCount(opData.repeatCount);

  for (let iteration = 0; iteration < repeat && opData.opType !== 'COMPLEX_MACHINE'; iteration++) {
  if (opData.opType === 'SHIFT_L') {
    newHead -= 1;
    scannedPositions.push(newHead);
  } else if (opData.opType === 'SHIFT_R') {
    newHead += 1;
    scannedPositions.push(newHead);
  } else if (opData.opType === 'SEARCH_L') {
    // Search left until blank
    let guard = 0;
    while ((newTape[newHead] ?? blank) !== blank && guard < 100000) {
      scannedPositions.push(newHead);
      newHead -= 1;
      guard++;
    }
  } else if (opData.opType === 'SEARCH_R') {
    // Search right until blank
    let guard = 0;
    while ((newTape[newHead] ?? blank) !== blank && guard < 100000) {
      scannedPositions.push(newHead);
      newHead += 1;
      guard++;
    }
  } else if (opData.opType === 'WRITE_SYM') {
    const symToWrite = opData.symbolToWrite ?? blank;
    newTape[newHead] = symToWrite;
  }
  }
  if (opData.opType === 'COMPLEX_MACHINE') {
    // Look up target submachine
    const subMachine = subMachines.find((sm) => sm.id === opData.subMachineId);
    if (!subMachine) {
      return {
        ...state,
        status: 'error',
        statusMessage: `Подмашина '${opData.subMachineId}' не найдена.`,
      };
    }
    const subStartNode = subMachine.nodes.find(
      (n) => (n.data as OperationNodeData).opType === 'START'
    );
    if (!subStartNode) {
      return {
        ...state,
        status: 'error',
        statusMessage: `У подмашины '${subMachine.name}' отсутствует узел START.`,
      };
    }

    // Determine return node: following the outgoing edge from this complex node
    const outgoing = activeEdges.filter((e) => e.source === currentNode.id);
    const returnTargetId = outgoing[0]?.target || currentNode.id;

    const newStack: CallStackFrame[] = [
      ...state.callStack,
      {
        subMachineId: subMachine.id,
        subMachineName: subMachine.name,
        returnNodeId: returnTargetId,
        repeatRemaining: repeat,
      },
    ];

    return {
      ...state,
      currentNodeId: subStartNode.id,
      callStack: newStack,
      stepCount: state.stepCount + 1,
      history: nextHistory,
      status: 'running',
      statusMessage: `Вызов подмашины '${subMachine.name}' -> вход в ${subStartNode.id}`,
    };
  }

  // Symbol now under head after operation
  const symbolAfterOp = newTape[newHead] ?? blank;

  // C. Find matching outgoing branch edge (priority: exact > complement > wildcard)
  const outgoingEdges = activeEdges.filter((e) => e.source === currentNode.id);
  const isWildcardRule = (r: EdgeRuleItem) =>
    r.isWildcard === true || (r.isWildcard === undefined && !r.isComplement && r.readSymbol === '*');
  const findEdgeByPriority = (predicate: (r: EdgeRuleItem) => boolean) =>
    outgoingEdges.find((edge) => (edge.data?.rules || []).some(predicate));

  const chosenEdge =
    outgoingEdges.find(edge => !(edge.data?.rules || []).some(isWildcardRule) &&
      (edge.data?.rules || []).some(r => !r.isComplement && r.readSymbol === symbolAfterOp)) ||
    outgoingEdges.find(edge => !(edge.data?.rules || []).some(isWildcardRule) &&
      (edge.data?.rules || []).some(r => !!r.isComplement && r.readSymbol !== symbolAfterOp)) ||
    findEdgeByPriority((r) => isWildcardRule(r));

  const nextTargetNodeId = chosenEdge?.target ?? null;

  const visitedSet = new Set(state.visitedPositions);
  for (const pos of scannedPositions) visitedSet.add(pos);
  visitedSet.add(newHead);
  const newVisited =
    visitedSet.size === state.visitedPositions.length ? state.visitedPositions : Array.from(visitedSet);

  if (!nextTargetNodeId) {
    return {
      ...state,
      tape: newTape,
      headPosition: newHead,
      visitedPositions: newVisited,
      status: 'halted',
      statusMessage: `Останов: из узла '${opData.label}' нет перехода для символа '${symbolAfterOp}'.`,
    };
  }

  return {
    ...state,
    currentNodeId: nextTargetNodeId,
    headPosition: newHead,
    tape: newTape,
    stepCount: state.stepCount + 1,
    visitedPositions: newVisited,
    history: nextHistory,
    activeEdgeId: chosenEdge?.id,
    status: 'running',
    statusMessage: `Шаг ${state.stepCount + 1}: ${opData.label} -> перешли в ${nextTargetNodeId}`,
  };
}

/**
 * Step back (undo step using history stack)
 */
export function stepBackMachine(state: RuntimeState): RuntimeState {
  if (state.history.length === 0) return state;

  const previous = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);

  return {
    ...state,
    currentNodeId: previous.currentNodeId,
    headPosition: previous.headPosition,
    tape: previous.tape,
    stepCount: previous.stepCount,
    visitedPositions: previous.visitedPositions,
    callStack: previous.callStack,
    history: newHistory,
    recentConfigs: (state.recentConfigs ?? []).slice(0, -1),
    status: 'paused',
    statusMessage: `Шаг назад: вернулись на такт ${previous.stepCount}.`,
  };
}

/**
 * Run a test case against the machine
 */
export function runTestCase(
  session: ProjectSession,
  testCase: TestCase,
  maxSteps = 10000
): TestCase {
  let state = initRuntimeState(session, testCase.inputTape, testCase.initialHeadPos ?? 0);

  let steps = 0;
  while (state.status !== 'halted' && state.status !== 'error' && steps < maxSteps) {
    state = stepMachine(session, state);
    steps++;
  }

  // Construct actual tape string from visited bounds
  const blank = session.alphabet.blankSymbol;
  const positions = Object.keys(state.tape)
    .map(Number)
    .filter((pos) => state.tape[pos] !== blank);

  let actualTapeStr = '';
  if (positions.length > 0) {
    const minPos = Math.min(...positions);
    const maxPos = Math.max(...positions);
    for (let i = minPos; i <= maxPos; i++) {
      actualTapeStr += state.tape[i] ?? blank;
    }
  } else {
    actualTapeStr = '';
  }

  let passed = true;
  const errors: string[] = [];

  if (state.status === 'error') {
    passed = false;
    errors.push(state.statusMessage || 'Ошибка выполнения');
  } else if (steps >= maxSteps) {
    passed = false;
    errors.push(`Превышен лимит шагов (${maxSteps}). Возможно, зацикливание.`);
  } else {
    if (testCase.expectedTape !== undefined && actualTapeStr !== testCase.expectedTape) {
      passed = false;
      errors.push(`Ожидалась лента "${testCase.expectedTape}", получено "${actualTapeStr}".`);
    }
    if (testCase.expectedHeadPos !== undefined && state.headPosition !== testCase.expectedHeadPos) {
      passed = false;
      errors.push(`Ожидалась позиция головки ${testCase.expectedHeadPos}, получено ${state.headPosition}.`);
    }
    if (testCase.expectedHalt && testCase.expectedHalt !== 'any') {
      const finalNode = session.nodes.find((n) => n.id === state.currentNodeId);
      const finalType = (finalNode?.data as StateNodeData | undefined)?.stateType;
      if (finalType !== testCase.expectedHalt) {
        passed = false;
        errors.push(`Ожидался останов в состоянии '${testCase.expectedHalt}', получено '${finalType ?? state.currentNodeId}'.`);
      }
    }
  }

  const errorMsg = errors.length > 0 ? errors.join(' ') : undefined;

  return {
    ...testCase,
    lastActualTape: actualTapeStr,
    lastActualHeadPos: state.headPosition,
    lastStepsCount: steps,
    status: passed ? 'passed' : 'failed',
    errorMessage: errorMsg,
  };
}
