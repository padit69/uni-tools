import { describe, expect, it } from "vitest";
import {
  elementBounds, elementsInBox, hitTest, hitTopmost, isDegenerate, parseScene, resizeBounds, scaleElement,
  sceneBounds, serializeScene, simplifyPoints, smoothPath, translateElement, distToSegment,
  type BoxEl, type DrawEl, type LineEl, type PenEl, type TextEl,
} from "../model";

const rect: BoxEl = { id: "r", type: "rect", stroke: "fg", width: 2, x: 0, y: 0, w: 100, h: 50, fill: false };
const ell: BoxEl = { id: "e", type: "ellipse", stroke: "#ff0000", width: 2, x: 200, y: 0, w: 100, h: 50, fill: false };
const line: LineEl = { id: "l", type: "line", stroke: "fg", width: 2, x1: 0, y1: 100, x2: 100, y2: 200 };
const arrow: LineEl = { ...line, id: "a", type: "arrow" };
const pen: PenEl = { id: "p", type: "pen", stroke: "fg", width: 4, points: [[0, 300], [50, 310], [100, 300]] };
const text: TextEl = { id: "t", type: "text", stroke: "fg", width: 2, x: 10, y: 400, text: "hello\nworld!", size: 20 };

describe("geometry", () => {
  it("distToSegment", () => {
    expect(distToSegment(5, 5, 0, 0, 10, 0)).toBe(5);
    expect(distToSegment(-3, 4, 0, 0, 10, 0)).toBe(5);
    expect(distToSegment(1, 1, 0, 0, 0, 0)).toBeCloseTo(Math.SQRT2);
  });

  it("computes bounds for each type", () => {
    expect(elementBounds(rect)).toEqual({ x: 0, y: 0, w: 100, h: 50 });
    expect(elementBounds({ ...line, x1: 100, x2: 0 })).toEqual({ x: 0, y: 100, w: 100, h: 100 });
    expect(elementBounds(pen)).toEqual({ x: 0, y: 300, w: 100, h: 10 });
    const tb = elementBounds(text);
    expect(tb.x).toBe(10);
    expect(tb.h).toBe(2 * 20 * 1.25);
    expect(tb.w).toBeGreaterThan(0);
  });

  it("scene bounds include stroke padding", () => {
    expect(sceneBounds([rect])).toEqual({ x: -1, y: -1, w: 102, h: 52 });
    expect(sceneBounds([])).toBeNull();
  });
});

describe("hitTest", () => {
  it("hits rect outline but not empty interior unless filled", () => {
    expect(hitTest(rect, 50, 1, 2)).toBe(true);
    expect(hitTest(rect, 50, 25, 2)).toBe(false);
    expect(hitTest({ ...rect, fill: true }, 50, 25, 2)).toBe(true);
    expect(hitTest(rect, 150, 25, 2)).toBe(false);
  });

  it("hits ellipse outline", () => {
    expect(hitTest(ell, 250, 0, 2)).toBe(true); // top
    expect(hitTest(ell, 300, 25, 2)).toBe(true); // right
    expect(hitTest(ell, 250, 25, 2)).toBe(false); // centre
    expect(hitTest({ ...ell, fill: true }, 250, 25, 2)).toBe(true);
    expect(hitTest(ell, 205, 5, 2)).toBe(false); // bbox corner, outside ellipse
  });

  it("hits lines, arrows, pen strokes and text", () => {
    expect(hitTest(line, 50, 150, 1)).toBe(true);
    expect(hitTest(line, 50, 170, 1)).toBe(false);
    expect(hitTest(arrow, 100, 200, 1)).toBe(true);
    expect(hitTest(pen, 25, 305, 1)).toBe(true);
    expect(hitTest(pen, 50, 330, 1)).toBe(false);
    expect(hitTest(text, 20, 410, 0)).toBe(true);
    expect(hitTest(text, 500, 410, 0)).toBe(false);
  });

  it("picks the topmost element", () => {
    const a = { ...rect, id: "a", fill: true };
    const b = { ...rect, id: "b", fill: true };
    expect(hitTopmost([a, b], 50, 25, 1)?.id).toBe("b");
    expect(hitTopmost([a, b], 500, 25, 1)).toBeNull();
  });

  it("box-selects fully contained elements", () => {
    const ids = elementsInBox([rect, ell, line] as DrawEl[], { x: -5, y: -5, w: 150, h: 70 });
    expect(ids).toEqual(["r"]);
  });
});

describe("transforms", () => {
  it("translates every type", () => {
    expect(translateElement(rect, 5, 6)).toMatchObject({ x: 5, y: 6, w: 100 });
    expect(translateElement(line, 1, 1)).toMatchObject({ x1: 1, y1: 101, x2: 101, y2: 201 });
    expect(translateElement(pen, 1, 0).points[0]).toEqual([1, 300]);
    expect(translateElement(rect, 1, 1)).not.toBe(rect);
  });

  it("scales elements between bounds", () => {
    const r = scaleElement(rect, { x: 0, y: 0, w: 100, h: 50 }, { x: 10, y: 10, w: 200, h: 100 });
    expect(r).toMatchObject({ x: 10, y: 10, w: 200, h: 100 });
    const p = scaleElement(pen, elementBounds(pen), { x: 0, y: 0, w: 50, h: 5 });
    expect(p.points[2]).toEqual([50, 0]);
    // zero-height source does not produce NaN
    const flat: LineEl = { ...line, y2: 100 };
    const s = scaleElement(flat, elementBounds(flat), { x: 0, y: 100, w: 50, h: 0 });
    expect(s.x2).toBe(50);
    expect(Number.isNaN(s.y2)).toBe(false);
  });

  it("resizes from a corner with the opposite corner fixed", () => {
    const b = { x: 0, y: 0, w: 100, h: 50 };
    expect(resizeBounds(b, "se", 150, 80)).toEqual({ x: 0, y: 0, w: 150, h: 80 });
    expect(resizeBounds(b, "nw", 20, 10)).toEqual({ x: 20, y: 10, w: 80, h: 40 });
    expect(resizeBounds(b, "se", -20, -10)).toEqual({ x: -20, y: -10, w: 20, h: 10 });
    expect(resizeBounds(b, "se", 200, 60, true)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
  });

  it("detects degenerate elements", () => {
    expect(isDegenerate({ ...rect, w: 1, h: 0 })).toBe(true);
    expect(isDegenerate({ ...text, text: "  " })).toBe(true);
    expect(isDegenerate(line)).toBe(false);
  });
});

describe("freehand", () => {
  it("simplifies collinear points", () => {
    const pts: [number, number][] = [[0, 0], [1, 0.01], [2, 0], [3, 0], [4, 5]];
    expect(simplifyPoints(pts, 0.5)).toEqual([[0, 0], [3, 0], [4, 5]]);
  });

  it("builds a smoothed path", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([[0, 0], [10, 0]])).toBe("M0 0L10 0");
    const d = smoothPath([[0, 0], [10, 10], [20, 0]]);
    expect(d).toBe("M0 0Q10 10 15 5L20 0");
    expect(smoothPath([[1, 1]])).toMatch(/^M1 1L/);
  });
});

describe("scene file", () => {
  it("round-trips", () => {
    const els = [rect, ell, line, arrow, pen, text] as DrawEl[];
    expect(parseScene(serializeScene(els))).toEqual(els);
  });

  it("accepts bare arrays and drops invalid elements", () => {
    const out = parseScene(JSON.stringify([
      rect,
      { type: "rect", x: "1" },
      { type: "unknown" },
      { id: "x", type: "rect", stroke: "javascript:alert(1)", width: -3, x: 10, y: 10, w: -5, h: 5 },
    ]));
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ stroke: "fg", width: 4, x: 5, w: 5, fill: false });
  });

  it("re-ids duplicates and rejects non-scenes", () => {
    const out = parseScene(JSON.stringify({ elements: [rect, rect] }));
    expect(out[0].id).not.toBe(out[1].id);
    expect(() => parseScene(`{"foo":1}`)).toThrow();
    expect(() => parseScene(`{`)).toThrow();
  });
});
