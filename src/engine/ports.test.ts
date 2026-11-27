import { describe, expect, it } from 'vitest';
import { resolvePorts } from './ports';
import { layoutWires } from './wireLayout';
import { autoLayoutGraph } from '../utils/autoLayout';
import type { TuringEdge, TuringNode } from '../types/turing';

const nodes: TuringNode[] = Array.from({ length: 7 }, (_, i) => ({
  id: `n${i}`, type: 'operationNode',
  position: { x: 0, y: 0 }, measured: { width: 190, height: 52 },
  data: { label: `n${i}`, opType: 'SHIFT_R' },
}));
const edges: TuringEdge[] = nodes.slice(1).map((node, i) => ({
  id: `e${i}`, source: nodes[i].id, target: node.id,
  sourceHandle: 'right', targetHandle: 'left',
  data: { mode: '4-tuple', subMode: 'operational', rules: [], sourcePortMode: 'auto', targetPortMode: 'auto' },
}));

describe('wrapped chain routing', () => {
  it('faces adjacent nodes on both rows and points down at the row turn', () => {
    const layout = autoLayoutGraph(nodes, edges);
    const resolved = resolvePorts(layout, edges).edges;
    expect([resolved[0].sourceHandle, resolved[0].targetHandle]).toEqual(['right', 'left']);
    expect([resolved[3].sourceHandle, resolved[3].targetHandle]).toEqual(['bottom', 'top']);
    expect([resolved[4].sourceHandle, resolved[4].targetHandle]).toEqual(['left', 'right']);
    expect([resolved[5].sourceHandle, resolved[5].targetHandle]).toEqual(['left', 'right']);
    const wire = layoutWires(layout, resolved).get('e5')!;
    expect(wire.points.every((point) => point.y === wire.points[0].y)).toBe(true);
  });

  it('keeps explicitly selected ports', () => {
    const layout = autoLayoutGraph(nodes, edges);
    const pinned = edges.map((edge, i) => i === 5 ? {
      ...edge, sourceHandle: 'right', targetHandle: 'left',
      data: { ...edge.data!, sourcePortMode: 'manual' as const, targetPortMode: 'manual' as const },
    } : edge);
    const resolved = resolvePorts(layout, pinned).edges;
    expect([resolved[5].sourceHandle, resolved[5].targetHandle]).toEqual(['right', 'left']);
  });
});
