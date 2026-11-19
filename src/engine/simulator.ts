import {
  ProjectSession,
  ExecutionSnapshot,
  CallStackFrame,
  StateNodeData,
  OperationNodeData,
  SparseTape,
  TestCase,
} from '../types/turing';

export interface RuntimeState {
  currentNodeId: string;
  headPosition: number;
  tape: SparseTape;
  stepCount: number;
  visitedPositions: number[];
  callStack: CallStackFrame[];
  history: ExecutionSnapshot[];
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
  let headPosition = customHeadPos !== undefined ? customHeadPos : session.initialHeadPosition || 0;

  if (customInputString !== undefined) {
    initialTape = {};
    for (let i = 0; i < customInputString.length; i++) {
      initialTape[i] = customInputString[i];
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

  return {
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
}

/**
 * Executes a single step of the Turing Machine
 */
export function stepMachine(
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

  if (opData.opType === 'SHIFT_L') {
    newHead -= 1;
  } else if (opData.opType === 'SHIFT_R') {
    newHead += 1;
  } else if (opData.opType === 'SEARCH_L') {
    // Search left until blank
    while ((newTape[newHead] ?? blank) !== blank) {
      newHead -= 1;
    }
  } else if (opData.opType === 'SEARCH_R') {
    // Search right until blank
    while ((newTape[newHead] ?? blank) !== blank) {
      newHead += 1;
    }
  } else if (opData.opType === 'WRITE_SYM') {
    const symToWrite = opData.symbolToWrite ?? blank;
    newTape[newHead] = symToWrite;
  } else if (opData.opType === 'COMPLEX_MACHINE') {
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

  // C. Find matching outgoing branch edge
  const outgoingEdges = activeEdges.filter((e) => e.source === currentNode.id);
  let nextTargetNodeId: string | null = null;
  let chosenEdge: any = null;

  for (const edge of outgoingEdges) {
    const rules = edge.data?.rules || [];
    const matched = rules.some((r: any) => {
      if (r.isWildcard || r.readSymbol === '*') return true;
      if (r.isComplement) return r.readSymbol !== symbolAfterOp;
      return r.readSymbol === symbolAfterOp;
    });

    if (matched) {
      nextTargetNodeId = edge.target;
      chosenEdge = edge;
      break;
    }
  }

  if (!nextTargetNodeId) {
    return {
      ...state,
      tape: newTape,
      headPosition: newHead,
      status: 'halted',
      statusMessage: `Останов: из узла '${opData.label}' нет перехода для символа '${symbolAfterOp}'.`,
    };
  }

  const newVisited = state.visitedPositions.includes(newHead)
    ? state.visitedPositions
    : [...state.visitedPositions, newHead];

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
  let errorMsg: string | undefined;

  if (state.status === 'error') {
    passed = false;
    errorMsg = state.statusMessage;
  } else if (steps >= maxSteps) {
    passed = false;
    errorMsg = `Превышен лимит шагов (${maxSteps}). Возможно, зацикливание.`;
  } else {
    if (testCase.expectedTape !== undefined && actualTapeStr !== testCase.expectedTape) {
      passed = false;
      errorMsg = `Ожидалась лента "${testCase.expectedTape}", получено "${actualTapeStr}".`;
    }
    if (testCase.expectedHeadPos !== undefined && state.headPosition !== testCase.expectedHeadPos) {
      passed = false;
      errorMsg = `Ожидалась позиция головки ${testCase.expectedHeadPos}, получено ${state.headPosition}.`;
    }
  }

  return {
    ...testCase,
    lastActualTape: actualTapeStr,
    lastActualHeadPos: state.headPosition,
    lastStepsCount: steps,
    status: passed ? 'passed' : 'failed',
    errorMessage: errorMsg,
  };
}
