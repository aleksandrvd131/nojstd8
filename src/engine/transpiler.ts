import { resolvePorts, pinnedSide } from './ports';
import {
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  OperationNodeData,
  AlphabetConfig,
  FourTupleSubMode,
  OperationalNodeType,
  ParsedCodeOp,
  SubMachine,
  MAX_OPERATION_REPEAT,
  operationRepeatCount,
} from '../types/turing';

/**
 * Converts 5-tuple rules into 4-tuple rules.
 * Rule: (q, a, a', d, q')
 * - If a !== a' and d !== 'N': split into (q, a, a', q_aux) and (q_aux, a', d, q')
 * - If a === a' and d !== 'N': (q, a, d, q')
 * - If d === 'N': (q, a, a', q')
 */
export function convert5TupleTo4Tuple(
  rules5: FiveTupleRule[],
  existingIds: Set<string> = new Set()
): {
  rules4: FourTupleRule[];
  auxiliaryNodes: { id: string; label: string }[];
} {
  const rules4: FourTupleRule[] = [];
  const auxiliaryNodes: { id: string; label: string }[] = [];
  const usedIds = new Set(existingIds);
  let auxCounter = 1;

  for (const r of rules5) {
    if (r.writeSymbol !== r.readSymbol && r.move !== 'N') {
      let auxState = `q_aux_${auxCounter++}`;
      while (usedIds.has(auxState)) {
        auxState = `q_aux_${auxCounter++}`;
      }
      usedIds.add(auxState);
      auxiliaryNodes.push({
        id: auxState,
        label: auxState,
      });

      // 1. Write symbol step
      rules4.push({
        id: `r4_${r.id}_w`,
        fromState: r.fromState,
        readSymbol: r.readSymbol,
        command: r.writeSymbol,
        toState: auxState,
      });

      // 2. Move head step
      rules4.push({
        id: `r4_${r.id}_m`,
        fromState: auxState,
        readSymbol: r.writeSymbol,
        command: r.move,
        toState: r.toState,
      });
    } else if (r.move !== 'N') {
      // Just shift head without changing symbol
      rules4.push({
        id: `r4_${r.id}`,
        fromState: r.fromState,
        readSymbol: r.readSymbol,
        command: r.move,
        toState: r.toState,
      });
    } else {
      // Just write symbol without moving
      rules4.push({
        id: `r4_${r.id}`,
        fromState: r.fromState,
        readSymbol: r.readSymbol,
        command: r.writeSymbol,
        toState: r.toState,
      });
    }
  }

  return { rules4, auxiliaryNodes };
}

/**
 * Converts 4-tuple rules into 5-tuple rules.
 * Rule: (q, a, C, q')
 * - If C in {'L', 'R', 'N'}: (q, a, a, C, q')
 * - Else (C is write symbol): (q, a, C, 'N', q')
 */
export function convert4TupleTo5Tuple(rules4: FourTupleRule[]): FiveTupleRule[] {
  const rules5: FiveTupleRule[] = [];

  for (const r of rules4) {
    if (r.command === 'L' || r.command === 'R' || r.command === 'N') {
      rules5.push({
        id: `r5_${r.id}`,
        fromState: r.fromState,
        readSymbol: r.readSymbol,
        writeSymbol: r.readSymbol,
        move: r.command,
        toState: r.toState,
      });
    } else {
      rules5.push({
        id: `r5_${r.id}`,
        fromState: r.fromState,
        readSymbol: r.readSymbol,
        writeSymbol: r.command,
        move: 'N',
        toState: r.toState,
      });
    }
  }

  return rules5;
}

function isWildcardRule(r: { isWildcard?: boolean; isComplement?: boolean; readSymbol: string }): boolean {
  return r.isWildcard === true || (r.isWildcard === undefined && !r.isComplement && r.readSymbol === '*');
}

function findMatchingOperationalEdge(outgoing: TuringEdge[], sym: string): TuringEdge | undefined {
  return (
    outgoing.find((e) =>
      !e.data?.rules?.some(isWildcardRule) &&
      e.data?.rules?.some((r) => !isWildcardRule(r) && !r.isComplement && r.readSymbol === sym)
    ) ||
    outgoing.find((e) => !e.data?.rules?.some(isWildcardRule) &&
      e.data?.rules?.some((r) => !!r.isComplement && r.readSymbol !== sym)) ||
    outgoing.find((e) => e.data?.rules?.some((r) => isWildcardRule(r)))
  );
}

/**
 * Compiles an Operational Diagram (VTM style) into canonical 4-tuple rules,
 * including inline expansion of COMPLEX_MACHINE sub-machine calls.
 */
export function compileOperationalDiagramTo4Tuples(
  nodes: TuringNode[],
  edges: TuringEdge[],
  alphabet: AlphabetConfig,
  subMachines: SubMachine[] = [],
  statePrefix = '',
  visitedSubMachineIds: Set<string> = new Set(),
  returnTargetBySym?: Map<string, string>
): FourTupleRule[] {
  // Expand repetitions only for compilation, never in the visual diagram.
  const expandedNodes: TuringNode[] = [];
  const expandedEdges: TuringEdge[] = [];
  const usedIds = new Set(nodes.map(node => node.id));
  const lastIds = new Map<string, string>();
  for (const node of nodes) {
    const data = node.data as Partial<OperationNodeData>;
    const count = data.opType === 'START' || data.opType === 'FINISH' ? 1 : operationRepeatCount(data.repeatCount);
    expandedNodes.push(node);
    let last = node.id;
    for (let i = 1; i < count; i++) {
      let id = `${node.id}__repeat_${i}`;
      while (usedIds.has(id)) id += '_';
      usedIds.add(id);
      expandedNodes.push({ ...node, id, data: { ...node.data, repeatCount: 1 } });
      expandedEdges.push({ id: `repeat_${last}_${id}`, source: last, target: id,
        data: { mode: '4-tuple', subMode: 'operational', rules: [{ id: `repeat_rule_${last}_${id}`, readSymbol: '*', isWildcard: true }] } });
      last = id;
    }
    lastIds.set(node.id, last);
  }
  nodes = expandedNodes;
  edges = [...expandedEdges, ...edges.map(edge => ({ ...edge, source: lastIds.get(edge.source) ?? edge.source }))];
  const rules4: FourTupleRule[] = [];
  const allSymbols = [...alphabet.symbols, alphabet.blankSymbol];
  const prefixId = (id: string) => `${statePrefix}${id}`;

  for (const node of nodes) {
    const data = node.data as Partial<OperationNodeData>;
    if (!data.opType) continue;

    const fromId = prefixId(node.id);
    const outgoing = edges.filter((e) => e.source === node.id);

    if (data.opType === 'FINISH') {
      if (returnTargetBySym) {
        for (const sym of allSymbols) {
          const returnTarget = returnTargetBySym.get(sym);
          if (returnTarget) {
            rules4.push({
              id: `op_${fromId}_ret_${sym}`,
              fromState: fromId,
              readSymbol: sym,
              command: 'N',
              toState: returnTarget,
            });
          }
        }
      }
      continue;
    }

    // Inline expansion for COMPLEX_MACHINE calls
    if (data.opType === 'COMPLEX_MACHINE' && data.subMachineId) {
      const subMachine = subMachines.find((sm) => sm.id === data.subMachineId);
      if (subMachine && !visitedSubMachineIds.has(subMachine.id)) {
        const subStart = subMachine.nodes.find(
          (n) => (n.data as OperationNodeData).opType === 'START'
        );
        if (subStart) {
          const nestedPrefix = `${fromId}__${subMachine.id}__`;
          const entryStateId = `${nestedPrefix}${subStart.id}`;

          for (const sym of allSymbols) {
            rules4.push({
              id: `op_${fromId}_call_${sym}`,
              fromState: fromId,
              readSymbol: sym,
              command: 'N',
              toState: entryStateId,
            });
          }

          const callerReturnMap = new Map<string, string>();
          for (const sym of allSymbols) {
            const matchingEdge = findMatchingOperationalEdge(outgoing, sym);
            if (matchingEdge) {
              callerReturnMap.set(sym, prefixId(matchingEdge.target));
            }
          }

          const nextVisited = new Set(visitedSubMachineIds);
          nextVisited.add(subMachine.id);
          const inlinedRules = compileOperationalDiagramTo4Tuples(
            subMachine.nodes,
            subMachine.edges,
            alphabet,
            subMachines,
            nestedPrefix,
            nextVisited,
            callerReturnMap
          );
          rules4.push(...inlinedRules);
          continue;
        }
      }
    }

    // If START node: directly branches on read symbol without altering tape
    if (data.opType === 'START') {
      for (const sym of allSymbols) {
        const matchingEdge = findMatchingOperationalEdge(outgoing, sym);
        if (matchingEdge) {
          rules4.push({
            id: `op_${fromId}_${sym}`,
            fromState: fromId,
            readSymbol: sym,
            command: 'N',
            toState: prefixId(matchingEdge.target),
          });
        }
      }
      continue;
    }

    // SEARCH_L and SEARCH_R: generate looping state until blank symbol, then branch to target
    if (data.opType === 'SEARCH_L' || data.opType === 'SEARCH_R') {
      const moveCmd = data.opType === 'SEARCH_L' ? 'L' : 'R';
      const blank = alphabet.blankSymbol;

      for (const sym of allSymbols) {
        if (sym === blank) continue;
        rules4.push({
          id: `op_${fromId}_loop_${sym}`,
          fromState: fromId,
          readSymbol: sym,
          command: moveCmd,
          toState: fromId,
        });
      }

      const matchingEdge = findMatchingOperationalEdge(outgoing, blank);
      if (matchingEdge) {
        rules4.push({
          id: `op_${fromId}_exit_${blank}`,
          fromState: fromId,
          readSymbol: blank,
          command: 'N',
          toState: prefixId(matchingEdge.target),
        });
      }
      continue;
    }

    // Determine the command performed by this operational node
    let command: string = 'N';
    if (data.opType === 'SHIFT_L') command = 'L';
    else if (data.opType === 'SHIFT_R') command = 'R';
    else if (data.opType === 'WRITE_SYM') command = data.symbolToWrite || alphabet.blankSymbol;

    for (const sym of allSymbols) {
      const matchingEdge = findMatchingOperationalEdge(outgoing, sym);
      if (matchingEdge) {
        rules4.push({
          id: `op_${fromId}_${sym}`,
          fromState: fromId,
          readSymbol: sym,
          command,
          toState: prefixId(matchingEdge.target),
        });
      }
    }
  }

  return rules4;
}

/**
 * Synchronize rules with edges while preserving existing handle bindings and label offsets.
 */
export function buildEdgesFromRules(
  rules: (FiveTupleRule | FourTupleRule)[],
  mode: '5-tuple' | '4-tuple',
  subMode?: FourTupleSubMode,
  existingEdges: TuringEdge[] = []
): TuringEdge[] {
  const existingByPair = new Map<string, TuringEdge>();
  for (const edge of existingEdges) {
    existingByPair.set(`${edge.source}->${edge.target}`, edge);
  }

  const groupMap = new Map<string, { source: string; target: string; rules: any[] }>();

  for (const r of rules) {
    const key = `${r.fromState}->${r.toState}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        source: r.fromState,
        target: r.toState,
        rules: [],
      });
    }

    if (mode === '5-tuple') {
      const r5 = r as FiveTupleRule;
      groupMap.get(key)!.rules.push({
        id: r5.id,
        readSymbol: r5.readSymbol,
        writeSymbol: r5.writeSymbol,
        move: r5.move,
      });
    } else {
      const r4 = r as FourTupleRule;
      groupMap.get(key)!.rules.push({
        id: r4.id,
        readSymbol: r4.readSymbol,
        command: r4.command,
      });
    }
  }

  const edges: TuringEdge[] = [];

  for (const [key, item] of groupMap.entries()) {
    const isSelfLoop = item.source === item.target;
    const reverseKey = `${item.target}->${item.source}`;
    const hasReverse = !isSelfLoop && groupMap.has(reverseKey);
    const existing = existingByPair.get(key);

    const edgeId = existing?.id || `edge_${item.source}_${item.target}`;

    edges.push({
      id: edgeId,
      source: item.source,
      target: item.target,
      ...(existing ? { sourceHandle: pinnedSide(existing, 'source') } : {}),
      ...(existing ? { targetHandle: pinnedSide(existing, 'target') } : {}),
      type: 'customTransition',
      data: {
        rules: item.rules,
        mode,
        subMode,
        isBiDirectional: hasReverse,
        offsetDirection: item.source < item.target ? 1 : -1,
        ...(existing?.data?.sourcePortMode ? { sourcePortMode: existing.data.sourcePortMode } : {}),
        ...(existing?.data?.targetPortMode ? { targetPortMode: existing.data.targetPortMode } : {}),
        ...(existing?.data?.labelOffset ? { labelOffset: existing.data.labelOffset } : {}),
      },
    });
  }

  return edges;
}

/**
 * Choose facing handles for rule-table edges that don't yet have user-selected
 * handles. This avoids React Flow falling back to the first handle (top).
 */
export function assignNearestEdgeHandles(nodes: TuringNode[], edges: TuringEdge[]) {
  return resolvePorts(nodes, edges).edges;
}

/** Find DFS back-edges so auto-layout can route cycles without distorting the forward flow. */
export function findFeedbackEdgeIds(nodes: TuringNode[], edges: TuringEdge[]): Set<string> {
  const outgoing = new Map<string, TuringEdge[]>();
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  }

  const state = new Map<string, 0 | 1 | 2>();
  const feedback = new Set<string>();
  const visit = (nodeId: string) => {
    state.set(nodeId, 1);
    for (const edge of outgoing.get(nodeId) ?? []) {
      const targetState = state.get(edge.target) ?? 0;
      if (targetState === 1) feedback.add(edge.id);
      else if (targetState === 0) visit(edge.target);
    }
    state.set(nodeId, 2);
  };

  const starts = nodes.filter((node) => {
    const data = node.data as { opType?: string; stateType?: string };
    return data.opType === 'START' || data.stateType === 'initial';
  });
  const roots = nodes.filter((node) => (incomingCount.get(node.id) ?? 0) === 0);
  for (const node of [...starts, ...roots, ...nodes]) {
    if (!state.has(node.id)) visit(node.id);
  }
  return feedback;
}

/**
 * Result of parsing VTM shorthand code.
 */
export interface ParseVTMCodeResult {
  ops: ParsedCodeOp[];
  errors: string[];
}

/**
 * Human-readable label for one parsed operation.
 */
export function getVTMCodeOpLabel(op: ParsedCodeOp): string {
  if (op.opType === 'COMPLEX_MACHINE') {
    return op.functionCode || op.subMachineName || 'K';
  }
  switch (op.opType) {
    case 'SHIFT_R':
      return 'r';
    case 'SHIFT_L':
      return 'l';
    case 'SEARCH_R':
      return 'R';
    case 'SEARCH_L':
      return 'L';
    case 'WRITE_SYM':
      return `[${op.symbolToWrite ?? '?'}]`;
    default:
      return op.opType;
  }
}

/**
 * Parse shorthand VTM code like "r^3 R 0" into parsed operations.
 *
 * Supported syntax (space separated):
 *   - r / r^n : shift right once / n times
 *   - l / l^n : shift left once / n times
 *   - R / R^n : search right until a blank cell (repeatable)
 *   - L / L^n : search left until a blank cell (repeatable)
 *   - <symbol> / <symbol>^n : write a symbol from the alphabet (repeatable)
 *
 * Example: "r^3 R 0" = shift right 3 times, then search right to the
 * next blank cell, then write 0.
 */
export function parseVTMCodeDetailed(
  code: string,
  alphabet: AlphabetConfig,
  functions: SubMachine[] = []
): ParseVTMCodeResult {
  const ops: ParsedCodeOp[] = [];
  const errors: string[] = [];
  const symbols = new Set([...alphabet.symbols, alphabet.blankSymbol]);

  const tokens = code.trim().split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const repeatMatch = token.match(/^(.*)\^(\d+)$/);
    const base = repeatMatch ? repeatMatch[1] : token;
    const count = repeatMatch ? Number(repeatMatch[2]) : 1;

    if (!base) {
      errors.push(`Некорректный токен: "${token}"`);
      continue;
    }

    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_OPERATION_REPEAT) {
      errors.push(`Некорректное число повторений в "${token}" (нужно 1–${MAX_OPERATION_REPEAT})`);
      continue;
    }

    const functionDefinition = functions.find((candidate) => candidate.code === base);
    if (functionDefinition) {
      ops.push({
        opType: 'COMPLEX_MACHINE',
        subMachineId: functionDefinition.id,
        subMachineName: functionDefinition.name,
        functionCode: functionDefinition.code,
        repeatCount: count,
      });
      continue;
    }

    let opType: OperationalNodeType | null = null;
    switch (base) {
      case 'r':
        opType = 'SHIFT_R';
        break;
      case 'l':
        opType = 'SHIFT_L';
        break;
      case 'R':
        opType = 'SEARCH_R';
        break;
      case 'L':
        opType = 'SEARCH_L';
        break;
      default:
        break;
    }

    if (opType) {
      ops.push({ opType, repeatCount: count });
      continue;
    }

    if (symbols.has(base)) {
      ops.push({ opType: 'WRITE_SYM', symbolToWrite: base, repeatCount: count });
      continue;
    }

    errors.push(
      `Неизвестная операция или символ: "${token}". ` +
        `Доступные символы: ${[...symbols].join(', ')}`
    );
  }

  return { ops, errors };
}

/**
 * Backwards-compatible helper that returns only the parsed operations.
 */
export function parseVTMCode(code: string, alphabet: AlphabetConfig): ParsedCodeOp[] {
  return parseVTMCodeDetailed(code, alphabet).ops;
}

/**
 * Compile parsed VTM code operations into a fragment of an operational diagram.
 *
 * Only operation nodes and the transitions between them are generated.
 * START and FINISH are intentionally not created: the fragment can be
 * inserted into an existing diagram and connected manually.
 */
export function compileVTMCodeToNodesAndEdges(
  parsedOps: ParsedCodeOp[],
  alphabet: AlphabetConfig,
  options: { idPrefix?: string; functions?: SubMachine[] } = {}
): { nodes: TuringNode[]; edges: TuringEdge[]; rules4: FourTupleRule[] } {
  const nodes: TuringNode[] = [];
  const edges: TuringEdge[] = [];
  const prefix = options.idPrefix ?? 'vtm';

  parsedOps.forEach((op, index) => {
    const nodeId = `${prefix}_op_${index}`;

    nodes.push({
      id: nodeId,
      type: 'operationNode',
      position: { x: 100 + index * 180, y: 150 },
      data: {
        label: getVTMCodeOpLabel(op),
        opType: op.opType,
        symbolToWrite: op.symbolToWrite,
        subMachineId: op.subMachineId,
        subMachineName: op.subMachineName,
        repeatCount: operationRepeatCount(op.repeatCount),
      },
    });

    if (index > 0) {
      const previousId = `${prefix}_op_${index - 1}`;
      edges.push({
      id: `e_${previousId}_${nodeId}`,
      source: previousId,
      target: nodeId,
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'customTransition',
        data: {
          sourcePortMode: 'auto',
          targetPortMode: 'auto',
          mode: '4-tuple',
          subMode: 'operational',
          rules: [
            {
              id: `r_${previousId}_${nodeId}`,
              readSymbol: '*',
              isWildcard: true,
            },
          ],
        },
      });
    }
  });

  const rules4 = compileOperationalDiagramTo4Tuples(nodes, edges, alphabet, options.functions);

  return { nodes, edges, rules4 };
}

/**
 * Full compilation: parse VTM code and return project-ready data.
 */
export function compileVTMCode(
  code: string,
  alphabet: AlphabetConfig,
  options: { name?: string; idPrefix?: string; functions?: SubMachine[] } = {}
) {
  const { ops, errors } = parseVTMCodeDetailed(code, alphabet, options.functions);
  const { nodes, edges, rules4 } = compileVTMCodeToNodesAndEdges(ops, alphabet, {
    idPrefix: options.idPrefix,
    functions: options.functions,
  });

  const projectName =
    options.name?.trim() ||
    `VTM: ${code.replace(/\s+/g, ' ').trim()}`;

  return {
    nodes,
    edges,
    rules4,
    parsedOps: ops,
    errors,
    projectName,
  };
}
