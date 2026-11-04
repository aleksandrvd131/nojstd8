import {
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  OperationalNodeType,
  AlphabetConfig,
  FourTupleSubMode,
} from '../types/turing';

/**
 * Converts 5-tuple rules into 4-tuple rules.
 * Rule: (q, a, a', d, q')
 * - If a !== a' and d !== 'N': split into (q, a, a', q_aux) and (q_aux, a', d, q')
 * - If a === a' and d !== 'N': (q, a, d, q')
 * - If d === 'N': (q, a, a', q')
 */
export function convert5TupleTo4Tuple(rules5: FiveTupleRule[]): {
  rules4: FourTupleRule[];
  auxiliaryNodes: { id: string; label: string }[];
} {
  const rules4: FourTupleRule[] = [];
  const auxiliaryNodes: { id: string; label: string }[] = [];
  let auxCounter = 1;

  for (const r of rules5) {
    if (r.writeSymbol !== r.readSymbol && r.move !== 'N') {
      const auxState = `q_aux_${auxCounter++}`;
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

/**
 * Compiles an Operational Diagram (VTM style) into canonical 4-tuple rules.
 * In VTM, an operational node performs an elementary action (Shift L/R, Write, etc.)
 * then branches according to the read symbol.
 */
export function compileOperationalDiagramTo4Tuples(
  nodes: TuringNode[],
  edges: TuringEdge[],
  alphabet: AlphabetConfig
): FourTupleRule[] {
  const rules4: FourTupleRule[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const allSymbols = [...alphabet.symbols, alphabet.blankSymbol];

  for (const node of nodes) {
    const data = node.data as {
      opType?: OperationalNodeType;
      symbolToWrite?: string;
      label?: string;
    };
    if (!data.opType || data.opType === 'FINISH') continue;

    // Find outgoing edges
    const outgoing = edges.filter((e) => e.source === node.id);

    // If START node: directly branches on read symbol without altering tape
    if (data.opType === 'START') {
      for (const sym of allSymbols) {
        const matchingEdge = outgoing.find((e) =>
          e.data?.rules?.some((r) => r.readSymbol === sym || r.readSymbol === '*' || r.isWildcard)
        );
        if (matchingEdge) {
          rules4.push({
            id: `op_${node.id}_${sym}`,
            fromState: node.id,
            readSymbol: sym,
            command: 'N',
            toState: matchingEdge.target,
          });
        }
      }
      continue;
    }

    // Determine the command performed by this operational node
    let command: string = 'N';
    if (data.opType === 'SHIFT_L') command = 'L';
    else if (data.opType === 'SHIFT_R') command = 'R';
    else if (data.opType === 'WRITE_SYM') command = data.symbolToWrite || alphabet.blankSymbol;
    else if (data.opType === 'SEARCH_L') command = 'L';
    else if (data.opType === 'SEARCH_R') command = 'R';

    // Outgoing transitions based on symbol condition
    for (const sym of allSymbols) {
      // Find edge that has condition matching sym
      const matchingEdge = outgoing.find((e) =>
        e.data?.rules?.some(
          (r) =>
            r.readSymbol === sym ||
            r.readSymbol === '*' ||
            r.isWildcard ||
            (r.isComplement && r.readSymbol !== sym)
        )
      );

      if (matchingEdge) {
        rules4.push({
          id: `op_${node.id}_${sym}`,
          fromState: node.id,
          readSymbol: sym,
          command,
          toState: matchingEdge.target,
        });
      }
    }
  }

  return rules4;
}

/**
 * Synchronize rules with edges.
 * Generates TuringEdges from rules array or updates edge data.
 */
export function buildEdgesFromRules(
  rules: (FiveTupleRule | FourTupleRule)[],
  mode: '5-tuple' | '4-tuple',
  subMode?: FourTupleSubMode
): TuringEdge[] {
  // Group rules by source and target
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
  const edgeKeys = Array.from(groupMap.keys());

  for (const [key, item] of groupMap.entries()) {
    const isSelfLoop = item.source === item.target;
    const reverseKey = `${item.target}->${item.source}`;
    const hasReverse = !isSelfLoop && groupMap.has(reverseKey);

    const edgeId = `edge_${item.source}_${item.target}`;

    edges.push({
      id: edgeId,
      source: item.source,
      target: item.target,
      type: 'customTransition',
      data: {
        rules: item.rules,
        mode,
        subMode,
        isBiDirectional: hasReverse,
        offsetDirection: item.source < item.target ? 1 : -1,
      },
    });
  }

  return edges;
}
