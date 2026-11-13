/**
 * Mini Draw — pure element model: types, geometry, bounds, hit-testing,
 * transforms and scene (de)serialization. No DOM access here.
 */

export type Pt = [number, number];

/** Special stroke value meaning "follow the theme foreground colour". */
export const FG = "fg";

export interface BaseEl {
  id: string;
  stroke: string;
  /** stroke width in world units */
  width: number;
}
export interface PenEl extends BaseEl { type: "pen"; points: Pt[] }
export interface LineEl extends BaseEl { type: "line" | "arrow"; x1: number; y1: number; x2: number; y2: number }
export interface BoxEl extends BaseEl { type: "rect" | "ellipse"; x: number; y: number; w: number; h: number; fill: boolean }
export interface TextEl extends BaseEl { type: "text"; x: number; y: number; text: string; size: number }
export type DrawEl = PenEl | LineEl | BoxEl | TextEl;
export type ElType = DrawEl["type"];

export interface Bounds { x: number; y: number; w: number; h: number }

export const STROKE_WIDTHS = { s: 2, m: 4, l: 7 } as const;
export const TEXT_SIZES = { s: 16, m: 24, l: 36 } as const;
export type SizeKey = keyof typeof STROKE_WIDTHS;

export const TEXT_LINE_HEIGHT = 1.25;
/** approximate glyph advance as a fraction of font size (no DOM measuring) */
export const TEXT_CHAR_WIDTH = 0.58;
export const FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

let idCounter = 0;
export function newId(): string {
  idCounter = (idCounter + 1) % 1e6;
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + idCounter.toString(36);
}

/* ---------------------------------------------------------------- geometry */

export function normRect(x1: number, y1: number, x2: number, y2: number): Bounds {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function textLines(el: TextEl): string[] {
  return el.text.split("\n");
}

export function textBounds(el: TextEl): Bounds {
  const lines = textLines(el);
  const maxLen = Math.max(1, ...lines.map((l) => l.length));
  return { x: el.x, y: el.y, w: maxLen * el.size * TEXT_CHAR_WIDTH, h: lines.length * el.size * TEXT_LINE_HEIGHT };
}

/** Arrow head: two short wings ending at (x2,y2). Returns [left, tip, right]. */
export function arrowHead(el: LineEl): [Pt, Pt, Pt] {
  const ang = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
  const len = Math.min(Math.hypot(el.x2 - el.x1, el.y2 - el.y1) * 0.5, 10 + el.width * 2.5);
  const spread = Math.PI / 7;
  return [
    [el.x2 - len * Math.cos(ang - spread), el.y2 - len * Math.sin(ang - spread)],
    [el.x2, el.y2],
    [el.x2 - len * Math.cos(ang + spread), el.y2 - len * Math.sin(ang + spread)],
  ];
}

/** Geometric bounds (without stroke width). */
export function elementBounds(el: DrawEl): Bounds {
  switch (el.type) {
    case "pen": {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of el.points) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (!el.points.length) return { x: 0, y: 0, w: 0, h: 0 };
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "line":
    case "arrow":
      return normRect(el.x1, el.y1, el.x2, el.y2);
    case "rect":
    case "ellipse":
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    case "text":
      return textBounds(el);
  }
}

export function unionBounds(list: Bounds[]): Bounds | null {
  if (!list.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of list) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Bounds of all elements, padded by their stroke widths. */
export function sceneBounds(els: DrawEl[]): Bounds | null {
  return unionBounds(
    els.map((el) => {
      const b = elementBounds(el);
      const pad = el.type === "text" ? 0 : el.width / 2 + (el.type === "arrow" ? el.width : 0);
      return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
    }),
  );
}

export function boundsContain(outer: Bounds, inner: Bounds): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

/* ------------------------------------------------------------- hit-testing */

/**
 * Is world point (px,py) on the element? `tol` is the extra tolerance in
 * world units (callers usually pass a screen tolerance divided by zoom).
 */
export function hitTest(el: DrawEl, px: number, py: number, tol: number): boolean {
  const t = tol + el.width / 2;
  switch (el.type) {
    case "pen": {
      const pts = el.points;
      if (pts.length === 1) return Math.hypot(px - pts[0][0], py - pts[0][1]) <= t;
      for (let i = 1; i < pts.length; i++) {
        if (distToSegment(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= t) return true;
      }
      return false;
    }
    case "line":
      return distToSegment(px, py, el.x1, el.y1, el.x2, el.y2) <= t;
    case "arrow": {
      if (distToSegment(px, py, el.x1, el.y1, el.x2, el.y2) <= t) return true;
      const [a, tip, b] = arrowHead(el);
      return distToSegment(px, py, a[0], a[1], tip[0], tip[1]) <= t || distToSegment(px, py, b[0], b[1], tip[0], tip[1]) <= t;
    }
    case "rect": {
      const { x, y, w, h } = el;
      const inside = px >= x && px <= x + w && py >= y && py <= y + h;
      if (el.fill && inside) return true;
      return (
        distToSegment(px, py, x, y, x + w, y) <= t ||
        distToSegment(px, py, x + w, y, x + w, y + h) <= t ||
        distToSegment(px, py, x + w, y + h, x, y + h) <= t ||
        distToSegment(px, py, x, y + h, x, y) <= t
      );
    }
    case "ellipse": {
      const rx = el.w / 2;
      const ry = el.h / 2;
      const cx = el.x + rx;
      const cy = el.y + ry;
      if (rx < 0.5 || ry < 0.5) return distToSegment(px, py, el.x, el.y, el.x + el.w, el.y + el.h) <= t;
      const dx = px - cx;
      const dy = py - cy;
      const d = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
      if (el.fill && d <= 1) return true;
      // approximate distance to the outline: radial offset scaled by local radius
      const r = d === 0 ? Math.min(rx, ry) : Math.hypot(dx, dy) / d;
      return Math.abs(d - 1) * r <= t;
    }
    case "text": {
      const b = textBounds(el);
      return px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
    }
  }
}

/** Topmost element under the point (last in list wins). */
export function hitTopmost(els: DrawEl[], px: number, py: number, tol: number): DrawEl | null {
  for (let i = els.length - 1; i >= 0; i--) if (hitTest(els[i], px, py, tol)) return els[i];
  return null;
}

/** Ids of elements whose bounds lie fully inside the selection box. */
export function elementsInBox(els: DrawEl[], box: Bounds): string[] {
  return els.filter((el) => boundsContain(box, elementBounds(el))).map((el) => el.id);
}

/* -------------------------------------------------------------- transforms */

export function translateElement<T extends DrawEl>(el: T, dx: number, dy: number): T {
  switch (el.type) {
    case "pen":
      return { ...el, points: el.points.map(([x, y]) => [x + dx, y + dy] as Pt) };
    case "line":
    case "arrow":
      return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
    default:
      return { ...el, x: (el as BoxEl | TextEl).x + dx, y: (el as BoxEl | TextEl).y + dy };
  }
}

/** Map an element from bounds `from` onto bounds `to` (used for resizing). */
export function scaleElement<T extends DrawEl>(el: T, from: Bounds, to: Bounds): T {
  const sx = from.w === 0 ? 1 : to.w / from.w;
  const sy = from.h === 0 ? 1 : to.h / from.h;
  const mx = (x: number) => to.x + (x - from.x) * sx;
  const my = (y: number) => to.y + (y - from.y) * sy;
  switch (el.type) {
    case "pen":
      return { ...el, points: el.points.map(([x, y]) => [mx(x), my(y)] as Pt) };
    case "line":
    case "arrow":
      return { ...el, x1: mx(el.x1), y1: my(el.y1), x2: mx(el.x2), y2: my(el.y2) };
    case "rect":
    case "ellipse": {
      const r = normRect(mx(el.x), my(el.y), mx(el.x + el.w), my(el.y + el.h));
      return { ...el, ...r };
    }
    case "text": {
      const s = Math.max(0.1, Math.abs(sy));
      return { ...el, x: Math.min(mx(el.x), mx(el.x + textBounds(el).w)), y: Math.min(my(el.y), my(el.y + textBounds(el).h)), size: Math.max(4, Math.round(el.size * s * 10) / 10) };
    }
  }
}

export type Corner = "nw" | "ne" | "sw" | "se";

/** New bounds when dragging `corner` of `b` to world point (px,py); the opposite corner stays fixed. */
export function resizeBounds(b: Bounds, corner: Corner, px: number, py: number, keepRatio = false): Bounds {
  const ax = corner === "nw" || corner === "sw" ? b.x + b.w : b.x;
  const ay = corner === "nw" || corner === "ne" ? b.y + b.h : b.y;
  let w = px - ax;
  let h = py - ay;
  if (keepRatio && b.w > 0 && b.h > 0) {
    const s = Math.max(Math.abs(w) / b.w, Math.abs(h) / b.h);
    w = Math.sign(w || 1) * b.w * s;
    h = Math.sign(h || 1) * b.h * s;
  }
  return normRect(ax, ay, ax + w, ay + h);
}

/** Does the element have zero useful size (e.g. a click without drag)? */
export function isDegenerate(el: DrawEl): boolean {
  switch (el.type) {
    case "pen":
      return el.points.length === 0;
    case "line":
    case "arrow":
      return Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 2;
    case "rect":
    case "ellipse":
      return el.w < 2 && el.h < 2;
    case "text":
      return el.text.trim() === "";
  }
}

/* ------------------------------------------------------------- freehand pen */

/** Ramer–Douglas–Peucker polyline simplification. */
export function simplifyPoints(pts: Pt[], epsilon: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(pts[i][0], pts[i][1], pts[s][0], pts[s][1], pts[e][0], pts[e][1]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx !== -1 && maxD > epsilon) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Smooth SVG path through points using quadratic curves between midpoints. */
export function smoothPath(pts: Pt[]): string {
  if (!pts.length) return "";
  if (pts.length === 1) {
    const [x, y] = pts[0];
    return `M${r2(x)} ${r2(y)}L${r2(x + 0.01)} ${r2(y)}`;
  }
  if (pts.length === 2) return `M${r2(pts[0][0])} ${r2(pts[0][1])}L${r2(pts[1][0])} ${r2(pts[1][1])}`;
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const mx = (x + pts[i + 1][0]) / 2;
    const my = (y + pts[i + 1][1]) / 2;
    d += `Q${r2(x)} ${r2(y)} ${r2(mx)} ${r2(my)}`;
  }
  const last = pts[pts.length - 1];
  d += `L${r2(last[0])} ${r2(last[1])}`;
  return d;
}

/* ------------------------------------------------------------------- scene */

export const SCENE_TYPE = "uni-tools/mini-draw";
export const SCENE_VERSION = 1;

export interface SceneFile { type: typeof SCENE_TYPE; version: number; elements: DrawEl[] }

export function serializeScene(els: DrawEl[]): string {
  const file: SceneFile = { type: SCENE_TYPE, version: SCENE_VERSION, elements: els };
  return JSON.stringify(file);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const COLOR_RE = /^(fg|#[0-9a-fA-F]{3,8})$/;

/** Validate & sanitize one raw element; returns null if invalid. */
export function sanitizeElement(raw: unknown): DrawEl | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const stroke = isStr(r.stroke) && COLOR_RE.test(r.stroke) ? r.stroke : FG;
  const width = isNum(r.width) && r.width > 0 && r.width <= 100 ? r.width : STROKE_WIDTHS.m;
  const id = isStr(r.id) && r.id ? r.id : newId();
  const base = { id, stroke, width };
  switch (r.type) {
    case "pen": {
      if (!Array.isArray(r.points)) return null;
      const points = r.points.filter((p): p is Pt => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1])).map((p) => [p[0], p[1]] as Pt);
      return points.length ? { ...base, type: "pen", points } : null;
    }
    case "line":
    case "arrow":
      if (![r.x1, r.y1, r.x2, r.y2].every(isNum)) return null;
      return { ...base, type: r.type, x1: r.x1 as number, y1: r.y1 as number, x2: r.x2 as number, y2: r.y2 as number };
    case "rect":
    case "ellipse":
      if (![r.x, r.y, r.w, r.h].every(isNum)) return null;
      return { ...base, type: r.type, ...normRect(r.x as number, r.y as number, (r.x as number) + (r.w as number), (r.y as number) + (r.h as number)), fill: r.fill === true };
    case "text":
      if (!isNum(r.x) || !isNum(r.y) || !isStr(r.text)) return null;
      return { ...base, type: "text", x: r.x, y: r.y, text: r.text, size: isNum(r.size) && r.size > 0 ? r.size : TEXT_SIZES.m };
    default:
      return null;
  }
}

/** Parse a scene file (or a bare element array). Throws on invalid input. */
export function parseScene(json: string): DrawEl[] {
  const data: unknown = JSON.parse(json);
  let list: unknown;
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).elements)) list = (data as Record<string, unknown>).elements;
  else throw new Error("Not a Mini Draw scene");
  const seen = new Set<string>();
  const out: DrawEl[] = [];
  for (const raw of list as unknown[]) {
    const el = sanitizeElement(raw);
    if (!el) continue;
    if (seen.has(el.id)) el.id = newId();
    seen.add(el.id);
    out.push(el);
  }
  return out;
}
