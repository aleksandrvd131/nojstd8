import type { TuringEdge, TuringNode } from '../types/turing';

export const sides = ['left', 'right', 'top', 'bottom'] as const;
export type Side = typeof sides[number];
export type Role = 'in' | 'out';
type End = 'source' | 'target';
type Point = { x: number; y: number };
const ends: End[] = ['source', 'target'];
export const normals: Record<Side, Point> = {
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 },
};

export function nodeBox(node: TuringNode) {
  const width = node.measured?.width ?? node.width ?? (node.type === 'operationNode' ? 132 : 120);
  const height = node.measured?.height ?? node.height ?? (node.type === 'operationNode' ? 52 : 40);
  return { ...node.position, width, height };
}

export function pinnedSide(edge: TuringEdge, end: End): Side | undefined {
  const value = edge[`${end}Handle`];
  return edge.data?.[`${end}PortMode`] !== 'auto' && sides.includes(value as Side)
    ? value as Side : undefined;
}

// Persist intent, never the result of a canvas layout. Legacy cardinal handle
// IDs are treated as manual because older saves did not record provenance.
export function restoreEdgePorts(edges: TuringEdge[], previous: TuringEdge[]) {
  const byId = new Map(previous.map(e => [e.id, e]));
  const byPair = new Map(previous.map(e => [JSON.stringify([e.source, e.target]), e]));
  return edges.map(edge => {
    const old = byId.get(edge.id) ?? byPair.get(JSON.stringify([edge.source, edge.target]));
    return old ? { ...edge, sourceHandle: pinnedSide(old, 'source'), targetHandle: pinnedSide(old, 'target') } : edge;
  });
}

type Endpoint = { index: number; end: End; pin?: Side; costs: number[] };

export function resolvePorts(nodes: TuringNode[], edges: TuringEdge[]) {
  const boxes = new Map(nodes.map(n => [n.id, nodeBox(n)]));
  const endpoints = new Map<string, Endpoint[]>();
  const resolved = edges.map(e => ({ ...e }));
  const roles = new Map<string, Partial<Record<Side, Role>>>();
  const conflicts = new Set<string>();
  edges.forEach((edge, index) => {
    for (const end of ends) {
      const id = edge[end], box = boxes.get(id);
      const dest = boxes.get(edge[end === 'source' ? 'target' : 'source']);
      if (!box || !dest) continue;
      const dx = dest.x + dest.width / 2 - box.x - box.width / 2;
      const dy = dest.y + dest.height / 2 - box.y - box.height / 2;
      const costs = sides.map(side => {
        if (edge.source === edge.target) return side === (end === 'source' ? 'top' : 'right') ? 0 : 2;
        const n = normals[side];
        const alignment = (dx * n.x + dy * n.y) / (Math.hypot(dx, dy) || 1);
        const horizontallySeparated = Math.abs(dx) >= (box.width + dest.width) / 2;
        const verticalPenalty = horizontallySeparated && (side === 'top' || side === 'bottom') ? 0.8 : 0;
        return 1 - alignment + (alignment < 0 ? 2 : 0) + verticalPenalty;
      });
      const list = endpoints.get(id) ?? [];
      list.push({ index, end, pin: pinnedSide(edge, end), costs });
      endpoints.set(id, list);
    }
  });
  for (const [id, list] of endpoints) {
    // Four physical ports => only 16 possible partitions into input/output.
    // Minimize turn cost, with a small LR-flow tie breaker for reciprocal pairs.
    let best: number[] | undefined, bestCost = Infinity;
    for (let mask = 0; mask < 16; mask++) {
      let cost = 0;
      const picks: number[] = [];
      for (const { end, pin, costs } of list) {
        let min = Infinity, pick = -1;
        sides.forEach((side, i) => {
          if ((pin && side !== pin) || Boolean(mask & (1 << i)) !== (end === 'source')) return;
          const score = costs[i] + (side === (end === 'source' ? 'right' : 'left') ? 0 : 0.05);
          if (score < min) { min = score; pick = i; }
        });
        if (pick < 0) { cost = Infinity; break; }
        cost += min;
        picks.push(pick);
      }
      if (cost < bestCost) { bestCost = cost; best = picks; }
    }
    if (!best) {
      conflicts.add(id);
      continue;
    }
    const usage: Partial<Record<Side, Role>> = {};
    list.forEach(({ index, end }, i) => {
      const side = sides[best![i]];
      resolved[index][`${end}Handle`] = side;
      usage[side] = end === 'source' ? 'out' : 'in';
    });
    roles.set(id, usage);
  }
  // Resolve aligned endpoints as a pair: if a clear, straight connection is
  // possible without changing a manual pin or mixing input/output roles on a
  // port, prefer it over two independently chosen detours.
  resolved.forEach((edge, index) => {
    if (edge.source === edge.target) return;
    const source = boxes.get(edge.source), target = boxes.get(edge.target);
    if (!source || !target || conflicts.has(edge.source) || conflicts.has(edge.target)) return;
    const sx = source.x + source.width / 2, sy = source.y + source.height / 2;
    const tx = target.x + target.width / 2, ty = target.y + target.height / 2;
    let pair: [Side, Side] | undefined;
    if (Math.abs(sy - ty) < 1 && Math.abs(tx - sx) > (source.width + target.width) / 2) {
      pair = tx > sx ? ['right', 'left'] : ['left', 'right'];
    } else if (Math.abs(sx - tx) < 1 && Math.abs(ty - sy) > (source.height + target.height) / 2) {
      pair = ty > sy ? ['bottom', 'top'] : ['top', 'bottom'];
    }
    if (!pair) return;
    const [sourceSide, targetSide] = pair;
    const original = edges[index];
    const sourcePin = pinnedSide(original, 'source'), targetPin = pinnedSide(original, 'target');
    if ((sourcePin && sourcePin !== sourceSide) || (targetPin && targetPin !== targetSide)) return;
    const roleAvailable = (nodeId: string, side: Side, role: Role) =>
      (endpoints.get(nodeId) ?? []).every((endpoint) => endpoint.index === index ||
        resolved[endpoint.index][`${endpoint.end}Handle`] !== side ||
        (endpoint.end === 'source' ? 'out' : 'in') === role);
    if (!roleAvailable(edge.source, sourceSide, 'out') || !roleAvailable(edge.target, targetSide, 'in')) return;
    const blocked = [...boxes.entries()].some(([id, box]) => {
      if (id === edge.source || id === edge.target) return false;
      return sourceSide === 'left' || sourceSide === 'right'
        ? sy > box.y && sy < box.y + box.height && box.x < Math.max(sx, tx) && box.x + box.width > Math.min(sx, tx)
        : sx > box.x && sx < box.x + box.width && box.y < Math.max(sy, ty) && box.y + box.height > Math.min(sy, ty);
    });
    if (blocked) return;
    edge.sourceHandle = sourceSide;
    edge.targetHandle = targetSide;
  });
  // Pair refinement can move an endpoint, so rebuild the role display.
  for (const [id, list] of endpoints) {
    if (conflicts.has(id)) continue;
    const usage: Partial<Record<Side, Role>> = {};
    for (const { index, end } of list) {
      const side = resolved[index][`${end}Handle`] as Side;
      if (side) usage[side] = end === 'source' ? 'out' : 'in';
    }
    roles.set(id, usage);
  }
  // On a two-wire return branch, match the two leaf ports to the actual
  // ports at the hub, not twice to its center. This uncrosses the loop.
  const tip = (node: string, side: Side) => {
    const b = boxes.get(node)!, n = normals[side];
    return { x: b.x + b.width / 2 + n.x * (b.width / 2 + 20),
      y: b.y + b.height / 2 + n.y * (b.height / 2 + 20) };
  };
  for (const [id, list] of endpoints) {
    if (list.length !== 2 || list.some(e => e.pin) || list[0].end === list[1].end) continue;
    const peers = list.map(({ index, end }) => {
      const other = end === 'source' ? 'target' : 'source';
      return { node: resolved[index][other], side: resolved[index][`${other}Handle`] as Side };
    });
    if (peers[0].node !== peers[1].node || peers[0].node === id ||
      peers.some(p => !p.side || !roles.has(p.node))) continue;
    const pair = list.map(e => resolved[e.index][`${e.end}Handle`] as Side);
    const score = (swap: number) => peers.reduce((sum, peer, i) => {
      const a = tip(id, pair[i ^ swap]), b = tip(peer.node, peer.side);
      return sum + Math.hypot(a.x - b.x, a.y - b.y);
    }, 0);
    if (score(1) + 1 < score(0)) list.forEach((e, i) => {
      const side = pair[1 - i];
      resolved[e.index][`${e.end}Handle`] = side;
      roles.get(id)![side] = e.end === 'source' ? 'out' : 'in';
    });
  }
  return { edges: resolved, roles, conflicts };
}
