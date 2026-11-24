import {
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  OperationalNodeType,
  AlphabetConfig,
  FourTupleSubMode,
  ParsedCodeOp,
  OperationNodeData,
  SubMachine,
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

    // SEARCH_L and SEARCH_R: generate looping state until blank symbol, then branch to target
    if (data.opType === 'SEARCH_L' || data.opType === 'SEARCH_R') {
      const moveCmd = data.opType === 'SEARCH_L' ? 'L' : 'R';
      const blank = alphabet.blankSymbol;

      // 1. Loop on all non-blank symbols
      for (const sym of allSymbols) {
        if (sym === blank) continue;
        rules4.push({
          id: `op_${node.id}_loop_${sym}`,
          fromState: node.id,
          readSymbol: sym,
          command: moveCmd,
          toState: node.id,
        });
      }

      // 2. Exit rule on reaching blank symbol
      const matchingEdge = outgoing.find((e) =>
        e.data?.rules?.some(
          (r) =>
            r.readSymbol === blank ||
            r.readSymbol === '*' ||
            r.isWildcard ||
            (r.isComplement && r.readSymbol !== blank)
        )
      );

      if (matchingEdge) {
        rules4.push({
          id: `op_${node.id}_exit_${blank}`,
          fromState: node.id,
          readSymbol: blank,
          command: 'N',
          toState: matchingEdge.target,
        });
      }
      continue;
    }

    // Determine the command performed by this operational node
    let command: string = 'N';
    if (data.opType === 'SHIFT_L') command = 'L';
    else if (data.opType === 'SHIFT_R') command = 'R';
    else if (data.opType === 'WRITE_SYM') command = data.symbolToWrite || alphabet.blankSymbol;

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

/**
 * Choose facing handles for rule-table edges that don't yet have user-selected
 * handles. This avoids React Flow falling back to the first handle (top).
 */
export function assignNearestEdgeHandles(
  nodes: TuringNode[],
  edges: TuringEdge[],
  existingEdges: TuringEdge[] = []
): TuringEdge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const existingByPair = new Map(
    existingEdges.map((edge) => [`${edge.source}->${edge.target}`, edge])
  );
  const occupied = new Map<string, Set<string>>();
  const reserve = (nodeId: string, handleId?: string | null) => {
    if (!handleId) return;
    const handles = occupied.get(nodeId) ?? new Set<string>();
    handles.add(handleId);
    occupied.set(nodeId, handles);
  };

  // Keep explicit/manual connections on their chosen handles and reserve
  // those ports before auto-assigning the remaining edges.
  for (const edge of edges) {
    reserve(edge.source, edge.sourceHandle);
    reserve(edge.target, edge.targetHandle);
  }
  for (const edge of existingEdges) {
    reserve(edge.source, edge.sourceHandle);
    reserve(edge.target, edge.targetHandle);
  }

  return edges.map((edge) => {
    const oldEdge = existingByPair.get(`${edge.source}->${edge.target}`);
    if (edge.sourceHandle && edge.targetHandle) return edge;
    if (oldEdge?.sourceHandle && oldEdge.targetHandle) {
      return {
        ...edge,
        sourceHandle: edge.sourceHandle ?? oldEdge.sourceHandle,
        targetHandle: edge.targetHandle ?? oldEdge.targetHandle,
      };
    }

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return edge;

    if (edge.source === edge.target) {
      reserve(edge.source, 'top');
      reserve(edge.target, 'right');
      return {
        ...edge,
        sourceHandle: edge.sourceHandle ?? 'top',
        targetHandle: edge.targetHandle ?? 'right',
      };
    }

    const sourceMeasured = sourceNode as TuringNode & {
      width?: number;
      height?: number;
      measured?: { width?: number; height?: number };
    };
    const targetMeasured = targetNode as TuringNode & {
      width?: number;
      height?: number;
      measured?: { width?: number; height?: number };
    };
    const sourceWidth =
      sourceMeasured.measured?.width ?? sourceMeasured.width ??
      (sourceNode.type === 'stateNode' ? 210 : 230);
    const sourceHeight =
      sourceMeasured.measured?.height ?? sourceMeasured.height ?? 80;
    const targetWidth =
      targetMeasured.measured?.width ?? targetMeasured.width ??
      (targetNode.type === 'stateNode' ? 210 : 230);
    const targetHeight =
      targetMeasured.measured?.height ?? targetMeasured.height ?? 80;
    const sourceCenter = {
      x: sourceNode.position.x + sourceWidth / 2,
      y: sourceNode.position.y + sourceHeight / 2,
    };
    const targetCenter = {
      x: targetNode.position.x + targetWidth / 2,
      y: targetNode.position.y + targetHeight / 2,
    };
    const portPoints = (center: { x: number; y: number }, width: number, height: number) => [
      { id: 'top', x: center.x, y: center.y - height / 2 },
      { id: 'right', x: center.x + width / 2, y: center.y },
      { id: 'bottom', x: center.x, y: center.y + height / 2 },
      { id: 'left', x: center.x - width / 2, y: center.y },
    ];
    const nearestFreePort = (
      nodeId: string,
      ports: ReturnType<typeof portPoints>,
      other: { x: number; y: number },
      preferred?: string | null
    ) => {
      const taken = occupied.get(nodeId) ?? new Set<string>();
      const ranked = preferred
        ? [...ports].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred))
        : [...ports].sort(
            (a, b) =>
              Math.hypot(a.x - other.x, a.y - other.y) -
              Math.hypot(b.x - other.x, b.y - other.y)
          );
      return ranked.find((port) => !taken.has(port.id))?.id ?? ranked[0].id;
    };
    const sourcePort = edge.sourceHandle
      ? edge.sourceHandle
      : nearestFreePort(
          edge.source,
          portPoints(sourceCenter, sourceWidth, sourceHeight),
          targetCenter,
          oldEdge?.sourceHandle
        );
    const targetPort = edge.targetHandle
      ? edge.targetHandle
      : nearestFreePort(
          edge.target,
          portPoints(targetCenter, targetWidth, targetHeight),
          sourceCenter,
          oldEdge?.targetHandle
        );
    reserve(edge.source, sourcePort);
    reserve(edge.target, targetPort);

    return {
      ...edge,
      sourceHandle: sourcePort,
      targetHandle: targetPort,
    };
  });
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

    if (!Number.isFinite(count) || count < 1) {
      errors.push(`Некорректное число повторений в "${token}" (нужно >= 1)`);
      continue;
    }

    const functionDefinition = !repeatMatch
      ? functions.find((candidate) => candidate.code === base)
      : undefined;
    if (functionDefinition) {
      ops.push({
        opType: 'COMPLEX_MACHINE',
        subMachineId: functionDefinition.id,
        subMachineName: functionDefinition.name,
        functionCode: functionDefinition.code,
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
      for (let i = 0; i < count; i++) {
        ops.push({ opType });
      }
      continue;
    }

    if (symbols.has(base)) {
      for (let i = 0; i < count; i++) {
        ops.push({ opType: 'WRITE_SYM', symbolToWrite: base });
      }
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
  options: { idPrefix?: string } = {}
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

  const rules4 = compileOperationalDiagramTo4Tuples(nodes, edges, alphabet);

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
