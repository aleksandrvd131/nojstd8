import { nodeBox, normals, type Side } from './ports';
import type { TuringNode, TuringEdge } from '../types/turing';

type Point = { x: number; y: number };
type Box = ReturnType<typeof nodeBox>;
export type Wire = { points: Point[]; label: Point };
const dist = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;
const segmentBox = (a: Point, b: Point, pad = 1): Box => ({
  x: Math.min(a.x, b.x) - pad, y: Math.min(a.y, b.y) - pad,
  width: Math.abs(a.x - b.x) + 2 * pad, height: Math.abs(a.y - b.y) + 2 * pad,
});
const simplified = (points: Point[]) => {
  const result: Point[] = [];
  for (const p of points) {
    const b = result[result.length - 1], a = result[result.length - 2];
    if (b && !dist(p, b)) continue;
    if (a && dist(a, b) + dist(b, p) === dist(a, p) && (a.x === b.x && b.x === p.x || a.y === b.y && b.y === p.y)) result.pop();
    result.push(p);
  }
  return result;
};
const anchor = (box: Box, side: Side, gap: number) => ({
  x: box.x + box.width / 2 + normals[side].x * (box.width / 2 + gap),
  y: box.y + box.height / 2 + normals[side].y * (box.height / 2 + gap),
});

export function layoutWires(nodes: TuringNode[], edges: TuringEdge[], options: { interactive?: boolean } = {}) {
  const boxes = new Map(nodes.map(n => [n.id, nodeBox(n)]));
  const obstacles = [...boxes.values()];
  const wires = new Map<string, Wire>();
  const lanes: Box[] = [], labels: Box[] = [];
  for (const edge of edges) {
    const source = boxes.get(edge.source), target = boxes.get(edge.target);
    const s = edge.sourceHandle as Side, t = edge.targetHandle as Side;
    if (!source || !target || !normals[s] || !normals[t]) continue;
    const a = anchor(source, s, 20), b = anchor(target, t, 20);
    const start = anchor(source, s, 4), end = anchor(target, t, 4);
    const candidates: Point[][] = [];
    const addX = (x: number) => candidates.push([{ x, y: a.y }, { x, y: b.y }]);
    const addY = (y: number) => candidates.push([{ x: a.x, y }, { x: b.x, y }]);
    const facing = (s === 'right' && t === 'left' && a.x <= b.x && a.y === b.y) ||
      (s === 'left' && t === 'right' && a.x >= b.x && a.y === b.y) ||
      (s === 'bottom' && t === 'top' && a.y <= b.y && a.x === b.x) ||
      (s === 'top' && t === 'bottom' && a.y >= b.y && a.x === b.x);
    const directSpan = segmentBox(start, end);
    const clearDirect = facing && !obstacles.some(o => overlaps(directSpan, o)) &&
      !lanes.some(l => overlaps(directSpan, l)) && !labels.some(l => overlaps(directSpan, l));
    if (clearDirect) {
      candidates.push([]);
    } else {
      candidates.push([{ x: a.x, y: b.y }], [{ x: b.x, y: a.y }]);
      addX((a.x + b.x) / 2); addY((a.y + b.y) / 2);
      // While dragging, keep the full collision checks but limit the number
      // of detour candidates. The normal router runs again on drag end.
      const detours = options.interactive
        ? [...obstacles].sort((x, y) => {
          const distance = (o: Box) => {
            const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
            return Math.max(0, Math.min(a.x, b.x) - cx, cx - Math.max(a.x, b.x)) +
              Math.max(0, Math.min(a.y, b.y) - cy, cy - Math.max(a.y, b.y));
          };
          return distance(x) - distance(y);
        }).slice(0, 8)
        : obstacles;
      for (const o of detours) {
        addX(o.x - 32); addX(o.x + o.width + 32);
        addY(o.y - 32); addY(o.y + o.height + 32);
      }
    }
    let best = Infinity, points: Point[] = [];
    for (const middle of candidates) {
      const path = simplified([start, a, ...middle, b, end]);
      let cost = path.length * 14;
      for (let i = 1; i < path.length; i++) {
        const p = path[i - 1], q = path[i], span = segmentBox(p, q);
        cost += dist(p, q);
        for (const o of obstacles) if (overlaps(span, o)) cost += 1e6;
        for (const lane of lanes) if (overlaps(span, lane)) {
          // Long coincident runs are much harder to follow than single crossings.
          cost += 12 + Math.min(span.width, lane.width) * Math.min(span.height, lane.height) * 0.3;
        }
        if (labels.some(l => overlaps(l, span))) cost += 200;
      }
      if (cost < best) { points = path; best = cost; }
    }
    const w = Math.min(240, 44 + (edge.data?.rules ?? []).reduce((n, r) =>
      n + 26 + (edge.data?.subMode === 'operational' ? r.readSymbol.length : 9) * 7, 0));
    let label = a, score = Infinity;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1], q = points[i], horizontal = p.y === q.y;
      for (const f of [0.5, 0.35, 0.65]) for (const side of [-1, 1]) {
        const x = p.x + (q.x - p.x) * f + (horizontal ? 0 : side * (w / 2 + 4));
        const y = p.y + (q.y - p.y) * f + (horizontal ? side * 19 : 0);
        const rect = { x: x - w / 2, y: y - 16, width: w, height: 32 };
        const cost = [...obstacles, ...labels].filter(o => overlaps(o, rect)).length * 1e5
          + lanes.filter(l => overlaps(l, rect)).length * 500 - Math.min(300, dist(p, q)) + Math.abs(f - 0.5);
        if (cost < score) { score = cost; label = { x, y }; }
      }
    }
    labels.push({ x: label.x - w / 2, y: label.y - 16, width: w, height: 32 });
    for (let i = 1; i < points.length; i++) lanes.push(segmentBox(points[i - 1], points[i]));
    wires.set(edge.id, { points, label });
  }
  return wires;
}

export function roundedWire(points: Point[]) {
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const radius = Math.min(8, dist(a, b) / 2, dist(b, c) / 2);
    const toward = (p: Point) => {
      const scale = radius / (Math.hypot(p.x - b.x, p.y - b.y) || 1);
      return `${b.x + (p.x - b.x) * scale} ${b.y + (p.y - b.y) * scale}`;
    };
    path += ` L ${toward(a)} Q ${b.x} ${b.y} ${toward(c)}`;
  }
  const end = points[points.length - 1];
  return `${path} L ${end.x} ${end.y}`;
}
