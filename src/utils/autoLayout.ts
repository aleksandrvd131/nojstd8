import dagre from 'dagre';
import { TuringNode, TuringEdge, OperationNodeData, StateNodeData } from '../types/turing';
import { nodeBox } from '../engine/ports';
import { findFeedbackEdgeIds } from '../engine/transpiler';

export function computeNonOverlappingPosition(existingNodes: TuringNode[]): { x: number; y: number } {
  if (existingNodes.length === 0) return { x: 120, y: 150 };

  const lastNode = existingNodes[existingNodes.length - 1];
  const maxX = Math.max(...existingNodes.map((n) => n.position.x));
  const minX = Math.min(...existingNodes.map((n) => n.position.x));

  let candidateX = lastNode ? lastNode.position.x + 200 : maxX + 200;
  let candidateY = lastNode ? lastNode.position.y : 150;

  if (candidateX > 850) {
    candidateX = Math.max(100, minX);
    const maxY = Math.max(...existingNodes.map((n) => n.position.y));
    candidateY = maxY + 140;
  }

  const isColliding = (x: number, y: number) =>
    existingNodes.some((n) => Math.abs(n.position.x - x) < 170 && Math.abs(n.position.y - y) < 90);

  let attempts = 0;
  while (isColliding(candidateX, candidateY) && attempts < 50) {
    candidateX += 190;
    if (candidateX > 900) {
      candidateX = Math.max(100, minX);
      candidateY += 130;
    }
    attempts++;
  }

  return { x: Math.round(candidateX), y: Math.round(candidateY) };
}

export function convertOperationNodesToStateNodes(nodes: TuringNode[]): TuringNode[] {
  return nodes.map((n) => {
    if (n.type === 'operationNode') {
      const opData = n.data as OperationNodeData;
      const isInitial = opData.opType === 'START';
      const isHalt = opData.opType === 'FINISH';
      return {
        id: n.id,
        type: 'stateNode' as const,
        position: { ...n.position },
        data: {
          label: opData.label || n.id,
          stateType: isInitial ? 'initial' : isHalt ? 'halt' : 'normal',
          description: opData.description,
        } satisfies StateNodeData,
      };
    }
    return n;
  });
}

export function autoLayoutGraph(
  nodes: TuringNode[],
  edges: TuringEdge[],
  direction = 'auto'
): TuringNode[] {
  if (direction === 'auto') {
    // Return transitions do not change the forward sequence. In particular,
    // a loop on a long chain should not turn the whole diagram into one row.
    const feedback = findFeedbackEdgeIds(nodes, edges);
    const links = edges.filter((edge) => edge.source !== edge.target && !feedback.has(edge.id));
    const incoming = new Map(nodes.map((node) => [node.id, 0]));
    const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
    for (const edge of links) {
      if (!incoming.has(edge.source) || !incoming.has(edge.target)) continue;
      incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
      outgoing.get(edge.source)!.push(edge.target);
    }
    // A sequence can also have shortcut transitions. Find a spanning path in
    // the acyclic forward graph rather than requiring every degree to be one.
    const queue = nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id);
    const length = new Map(nodes.map(node => [node.id, 1]));
    const previous = new Map<string, string>();
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const target of outgoing.get(id) ?? []) {
        if (length.get(target)! < length.get(id)! + 1) {
          length.set(target, length.get(id)! + 1);
          previous.set(target, id);
        }
        incoming.set(target, incoming.get(target)! - 1);
        if (incoming.get(target) === 0) queue.push(target);
      }
    }
    const end = nodes.find(node => length.get(node.id) === nodes.length);
    if (nodes.length < 6 || !end) return autoLayoutGraph(nodes, edges, 'balanced');
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const ordered: TuringNode[] = [];
    let current: string | undefined = end.id;
    while (current) {
      ordered.push(byId.get(current)!);
      current = previous.get(current);
    }
    ordered.reverse();
    const width = Math.max(...nodes.map((node) => nodeBox(node).width));
    const height = Math.max(...nodes.map((node) => nodeBox(node).height));
    // Compare a bounded number of widths, using only inexpensive geometry.
    // Reserve generous gutters for wire labels and return transitions.
    const ideal = Math.max(4, Math.ceil(Math.sqrt(nodes.length * 1.5)));
    const choices = [...new Set([ideal - 1, ideal, ideal + 1].map(c => Math.max(4, Math.min(nodes.length, c))))];
    const score = (columns: number) => {
      const rows = Math.ceil(nodes.length / columns);
      const w = columns * width + (columns - 1) * 100;
      const h = rows * height + (rows - 1) * 140;
      const aspect = w / h;
      return w * h * (1 + 0.15 * Math.abs(Math.log(aspect / 2.5)));
    };
    const columns = choices.reduce((best, choice) => score(choice) < score(best) ? choice : best);
    const positions = new Map(ordered.map((node, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      return [node.id, {
        x: 36 + (row % 2 ? columns - 1 - column : column) * (width + 100),
        y: 36 + row * (height + 140),
      }];
    }));
    return nodes.map((node) => ({ ...node, position: positions.get(node.id)! }));
  }
  const balanced = direction === 'balanced';
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: balanced ? 'LR' : direction,
    ranksep: balanced ? 90 : 125,
    nodesep: 88,
    edgesep: 36,
    marginx: 36,
    marginy: 36,
  });

  const feedbackEdges = findFeedbackEdgeIds(nodes, edges);
  // A leaf whose only transition returns immediately to its parent is a
  // side trip, not the next stage of the machine's forward path.
  const branches = new Map<string, string>();
  const neighbors = new Map(nodes.map((n) => [n.id, new Set<string>()]));
  for (const e of edges) {
    if (e.source !== e.target) {
      neighbors.get(e.source)?.add(e.target);
      neighbors.get(e.target)?.add(e.source);
    }
  }
  if (direction === 'LR' || balanced) {
    for (const e of edges) {
      if (
        feedbackEdges.has(e.id) &&
        neighbors.get(e.source)?.size === 1 &&
        (neighbors.get(e.target)?.size ?? 0) > 1 &&
        e.source !== e.target
      ) {
        branches.set(e.source, e.target);
      }
    }
  }

  nodes.forEach((n) => {
    if (branches.has(n.id)) return;
    const { width, height } = nodeBox(n);
    g.setNode(n.id, { width, height });
  });

  const forwardTargets = new Map<string, Set<string>>();
  const forwardIncoming = new Map<string, string[]>();
  if (balanced) for (const edge of edges) {
    if (feedbackEdges.has(edge.id)) continue;
    const targets = forwardTargets.get(edge.source) ?? new Set<string>();
    targets.add(edge.target);
    forwardTargets.set(edge.source, targets);
    const sources = forwardIncoming.get(edge.target) ?? [];
    sources.push(edge.source);
    forwardIncoming.set(edge.target, sources);
  }
  edges.forEach((e, index) => {
    // Back-edges describe cycles, not forward flow. Leaving them out keeps a
    // small return transition from pulling an entire branch into a wide loop.
    if (feedbackEdges.has(e.id) || branches.has(e.source) || branches.has(e.target)) return;
    // A short detour that rejoins a direct transition is a side branch,
    // not an extra stage that should push the destination further right.
    if (balanced && (forwardIncoming.get(e.source) ?? []).some(source =>
      source !== e.target && forwardTargets.get(source)?.has(e.target)
    )) return;
    g.setEdge(e.source, e.target, {}, `${e.id}-${index}`);
  });

  dagre.layout(g);

  const placed = nodes.filter((n) => !branches.has(n.id)).map((n) => g.node(n.id));
  const branchCount = new Map<string, number>();
  for (const n of nodes) {
    const parent = branches.get(n.id);
    if (!parent) continue;
    const hub = g.node(parent);
    if (!hub) continue;
    const count = branchCount.get(parent) ?? 0;
    const sign = count % 2 ? 1 : -1;
    branchCount.set(parent, count + 1);
    const { width, height } = nodeBox(n);
    const x = hub.x + hub.width / 2 + 62;
    let y = hub.y + sign * ((height + hub.height) / 2 + 72);
    for (const p of [...placed].sort((a, b) => sign * (a.y - b.y))) {
      if (
        Math.abs(x - p.x) < (width + p.width) / 2 + 24 &&
        Math.abs(y - p.y) < (height + p.height) / 2 + 48
      ) {
        y = p.y + sign * ((height + p.height) / 2 + 72);
      }
    }
    const pos = { x, y, width, height };
    g.setNode(n.id, pos);
    placed.push(g.node(n.id));
  }

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const { width, height } = nodeBox(n);
    return {
      ...n,
      position: {
        x: pos ? pos.x - width / 2 : n.position.x,
        y: pos ? pos.y - height / 2 : n.position.y,
      },
    };
  });
}
