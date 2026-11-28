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

  it('wraps the same backbone when it has a return transition and a self-loop', () => {
    const extra: TuringEdge[] = [
      { id: 'return', source: 'n5', target: 'n2', data: { mode: '4-tuple', rules: [] } },
      { id: 'loop', source: 'n3', target: 'n3', data: { mode: '4-tuple', rules: [] } },
    ];
    const layout = autoLayoutGraph(nodes, [...edges, ...extra]);
    expect(layout.map(n => n.position)).toEqual(autoLayoutGraph(nodes, edges).map(n => n.position));
    const resolved = resolvePorts(layout, [...edges, ...extra]);
    expect(resolved.conflicts.size).toBe(0);
    expect(layoutWires(layout, resolved.edges).size).toBe(edges.length + extra.length);
    expect(autoLayoutGraph(nodes, [...edges, ...extra])).toEqual(layout);
  });

  it('orders the backbone by transitions rather than input node order', () => {
    const shuffled = [...nodes].reverse();
    const layout = autoLayoutGraph(shuffled, edges);
    const positions = new Map(layout.map(node => [node.id, node.position]));
    expect(positions.get('n0')!.x).toBeLessThan(positions.get('n1')!.x);
    expect(positions.get('n3')!.x).toBe(positions.get('n4')!.x);
  });

  it('wraps a backbone with both forward shortcuts and return transitions', () => {
    const extra: TuringEdge[] = [
      { id: 'shortcut', source: 'n1', target: 'n5', data: { mode: '4-tuple', rules: [] } },
      { id: 'return', source: 'n4', target: 'n2', data: { mode: '4-tuple', rules: [] } },
    ];
    const layout = autoLayoutGraph(nodes, [...edges, ...extra]);
    expect(new Set(layout.map(node => node.position.y)).size).toBe(2);
    expect(layout.map(node => node.position)).toEqual(autoLayoutGraph(nodes, edges).map(node => node.position));
  });

  it('routes an adjacent return on one side of both cards', () => {
    const adjacent = nodes.slice(0, 2).map((node, i) => ({
      ...node, position: { x: i * 300, y: 0 },
    }));
    const forward = { ...edges[0], sourceHandle: undefined, targetHandle: undefined };
    const back = { ...forward, id: 'back', source: 'n1', target: 'n0' };
    const resolved = resolvePorts(adjacent, [forward, back]).edges;
    expect([resolved[0].sourceHandle, resolved[0].targetHandle]).toEqual(['right', 'left']);
    expect(resolved[1].sourceHandle).toBe(resolved[1].targetHandle);
    expect(['top', 'bottom']).toContain(resolved[1].sourceHandle);
  });
});
