import { describe, expect, it } from "vitest";
import { elementShapes, escapeXml, liveResolver, sceneToSvg } from "../svg";
import { zoomAt, screenToWorld, worldToScreen, clampZoom } from "../viewport";
import type { BoxEl, DrawEl, TextEl } from "../model";

const rect: BoxEl = { id: "r", type: "rect", stroke: "fg", width: 2, x: 0, y: 0, w: 100, h: 50, fill: true };
const text: TextEl = { id: "t", type: "text", stroke: "#ff0000", width: 2, x: 0, y: 60, text: "a<b>&\nline2", size: 20 };

describe("svg serialization", () => {
  it("uses currentColor for the theme colour live", () => {
    expect(elementShapes(rect, liveResolver).attrs).toMatchObject({ stroke: "currentColor", fill: "currentColor" });
  });

  it("serializes a scene with resolved colours, viewBox and background", () => {
    const { svg, width, height } = sceneToSvg([rect, text] as DrawEl[], { foreground: "#111111", background: "#ffffff", padding: 10 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('stroke="#111111"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('fill-opacity="0.18"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain("a&lt;b&gt;&amp;");
    expect(svg).toContain("<tspan");
    expect(svg).not.toContain("currentColor");
    expect(width).toBeGreaterThan(100);
    expect(height).toBeGreaterThan(100);
    expect(svg).toMatch(/viewBox="-11 -11 /);
  });

  it("omits the background when transparent", () => {
    const { svg } = sceneToSvg([rect], { foreground: "#000", background: null });
    expect(svg.match(/<rect/g)).toHaveLength(1);
  });

  it("produces parseable XML", () => {
    const { svg } = sceneToSvg([rect, text] as DrawEl[], { foreground: "#000", background: null });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(doc.getElementsByTagName("tspan")).toHaveLength(2);
  });

  it("escapes xml", () => {
    expect(escapeXml(`<"'&>`)).toBe("&lt;&quot;&apos;&amp;&gt;");
  });
});

describe("viewport", () => {
  it("converts between screen and world", () => {
    const v = { x: 10, y: 20, zoom: 2 };
    expect(screenToWorld(v, 30, 40)).toEqual([10, 10]);
    expect(worldToScreen(v, 10, 10)).toEqual([30, 40]);
  });

  it("zooms around a fixed screen point", () => {
    const v = { x: 0, y: 0, zoom: 1 };
    const before = screenToWorld(v, 100, 50);
    const z = zoomAt(v, 2, 100, 50);
    expect(screenToWorld(z, 100, 50)).toEqual(before);
    expect(clampZoom(100)).toBe(8);
    expect(clampZoom(0)).toBe(0.1);
  });
});
