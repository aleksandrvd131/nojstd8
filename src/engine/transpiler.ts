import {
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  OperationNodeData,
  AlphabetConfig,
  FourTupleSubMode,
  SubMachine,
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
      e.data?.rules?.some((r) => !isWildcardRule(r) && !r.isComplement && r.readSymbol === sym)
    ) ||
    outgoing.find((e) => e.data?.rules?.some((r) => !!r.isComplement && r.readSymbol !== sym)) ||
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
      ...(existing?.sourceHandle ? { sourceHandle: existing.sourceHandle } : {}),
      ...(existing?.targetHandle ? { targetHandle: existing.targetHandle } : {}),
      type: 'customTransition',
      data: {
        rules: item.rules,
        mode,
        subMode,
        isBiDirectional: hasReverse,
        offsetDirection: item.source < item.target ? 1 : -1,
        ...(existing?.data?.labelOffset ? { labelOffset: existing.data.labelOffset } : {}),
      },
    });
  }

  return edges;
}
