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
  direction = 'LR'
): TuringNode[] {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: 125,
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
  if (direction === 'LR') {
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

  edges.forEach((e, index) => {
    // Back-edges describe cycles, not forward flow. Leaving them out keeps a
    // small return transition from pulling an entire branch into a wide loop.
    if (feedbackEdges.has(e.id) || branches.has(e.source) || branches.has(e.target)) return;
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
