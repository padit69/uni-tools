/**
 * Element → SVG shape descriptors, shared by the live React renderer and the
 * string serializer used for SVG/PNG export.
 */
import {
  FG,
  FONT_FAMILY,
  TEXT_LINE_HEIGHT,
  arrowHead,
  sceneBounds,
  smoothPath,
  textLines,
  type DrawEl,
} from "./model";

export interface ShapeNode {
  tag: "path" | "rect" | "ellipse" | "text" | "tspan" | "g";
  attrs: Record<string, string | number>;
  children?: ShapeNode[];
  text?: string;
}

export const FILL_OPACITY = 0.18;

/** Resolve a stored colour to an SVG paint value. */
export type ColorResolver = (stroke: string) => string;
export const liveResolver: ColorResolver = (c) => (c === FG ? "currentColor" : c);

const r2 = (n: number) => Math.round(n * 100) / 100;

export function elementShapes(el: DrawEl, resolve: ColorResolver): ShapeNode {
  const color = resolve(el.stroke);
  const strokeAttrs = { stroke: color, strokeWidth: el.width, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  switch (el.type) {
    case "pen":
      return { tag: "path", attrs: { ...strokeAttrs, d: smoothPath(el.points) } };
    case "line":
      return { tag: "path", attrs: { ...strokeAttrs, d: `M${r2(el.x1)} ${r2(el.y1)}L${r2(el.x2)} ${r2(el.y2)}` } };
    case "arrow": {
      const [a, tip, b] = arrowHead(el);
      const d = `M${r2(el.x1)} ${r2(el.y1)}L${r2(el.x2)} ${r2(el.y2)}M${r2(a[0])} ${r2(a[1])}L${r2(tip[0])} ${r2(tip[1])}L${r2(b[0])} ${r2(b[1])}`;
      return { tag: "path", attrs: { ...strokeAttrs, d } };
    }
    case "rect": {
      const rx = r2(Math.min(8, el.w / 4, el.h / 4));
      return {
        tag: "rect",
        attrs: { ...strokeAttrs, x: r2(el.x), y: r2(el.y), width: r2(el.w), height: r2(el.h), rx, ...(el.fill ? { fill: color, fillOpacity: FILL_OPACITY } : {}) },
      };
    }
    case "ellipse":
      return {
        tag: "ellipse",
        attrs: { ...strokeAttrs, cx: r2(el.x + el.w / 2), cy: r2(el.y + el.h / 2), rx: r2(el.w / 2), ry: r2(el.h / 2), ...(el.fill ? { fill: color, fillOpacity: FILL_OPACITY } : {}) },
      };
    case "text": {
      const lh = el.size * TEXT_LINE_HEIGHT;
      return {
        tag: "text",
        attrs: { x: r2(el.x), y: r2(el.y), fill: color, fontSize: el.size, fontFamily: FONT_FAMILY, style: "white-space:pre" },
        children: textLines(el).map((line, i) => ({
          tag: "tspan",
          // baseline sits roughly 0.8em below the top of each line box
          attrs: { x: r2(el.x), y: r2(el.y + i * lh + (lh - el.size) / 2 + el.size * 0.82) },
          text: line,
        })),
      };
    }
  }
}

/* ---------------------------------------------------------- serialization */

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

export function nodeToString(n: ShapeNode): string {
  const attrs = Object.entries(n.attrs)
    .map(([k, v]) => ` ${kebab(k)}="${escapeXml(String(v))}"`)
    .join("");
  const inner = (n.text != null ? escapeXml(n.text) : "") + (n.children ?? []).map(nodeToString).join("");
  return inner ? `<${n.tag}${attrs}>${inner}</${n.tag}>` : `<${n.tag}${attrs}/>`;
}

export interface ExportOptions {
  /** concrete colour used for elements with the theme foreground colour */
  foreground: string;
  /** background fill, or null for transparent */
  background: string | null;
  padding?: number;
}

export interface SvgExport { svg: string; width: number; height: number }

export function sceneToSvg(els: DrawEl[], opts: ExportOptions): SvgExport {
  const pad = opts.padding ?? 24;
  const b = sceneBounds(els) ?? { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.floor(b.x - pad);
  const y = Math.floor(b.y - pad);
  const width = Math.ceil(b.w + pad * 2);
  const height = Math.ceil(b.h + pad * 2);
  const resolve: ColorResolver = (c) => (c === FG ? opts.foreground : c);
  const bg = opts.background ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${escapeXml(opts.background)}"/>` : "";
  const body = els.map((el) => nodeToString(elementShapes(el, resolve))).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">${bg}${body}</svg>`;
  return { svg, width, height };
}
