import dagre from 'dagre';
import { TuringNode, TuringEdge, OperationNodeData, StateNodeData } from '../types/turing';

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
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 100, nodesep: 60 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: 140, height: 75 });
  });

  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos ? pos.x - 70 : n.position.x,
        y: pos ? pos.y - 37 : n.position.y,
      },
    };
  });
}
