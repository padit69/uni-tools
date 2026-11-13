import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { I18nProvider } from "@/i18n";
import MiniDrawTool from "../Tool";

beforeAll(() => {
  if (!("PointerEvent" in window)) {
    class PE extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    // @ts-expect-error jsdom polyfill
    window.PointerEvent = PE;
  }
});

beforeEach(() => localStorage.clear());

function setup() {
  const r = render(<I18nProvider><MiniDrawTool /></I18nProvider>);
  const svg = r.container.querySelector("svg[role=img]") as SVGSVGElement;
  const drag = (x1: number, y1: number, x2: number, y2: number, opts: PointerEventInit = {}) => {
    fireEvent.pointerDown(svg, { pointerId: 1, button: 0, clientX: x1, clientY: y1, ...opts });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: (x1 + x2) / 2, clientY: (y1 + y2) / 2, ...opts });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: x2, clientY: y2, ...opts });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: x2, clientY: y2, ...opts });
  };
  const key = (k: string, o: KeyboardEventInit = {}) => fireEvent.keyDown(window, { key: k, ...o });
  const shapes = () => svg.querySelectorAll("g[transform] > g > :is(path,rect,ellipse,text)");
  return { ...r, svg, drag, key, shapes };
}

describe("MiniDrawTool", () => {
  it("draws shapes, selects, deletes and undoes", () => {
    const { drag, key, shapes, svg } = setup();
    key("r");
    drag(10, 10, 110, 60);
    expect(svg.querySelector("g[transform] rect[rx]")).toBeTruthy();
    key("p");
    drag(200, 200, 260, 230);
    key("a");
    drag(0, 300, 100, 300);
    expect(shapes()).toHaveLength(3);

    key("v");
    drag(-20, -20, 150, 100); // marquee around rectangle
    key("Delete");
    expect(shapes()).toHaveLength(2);
    key("z", { ctrlKey: true });
    expect(shapes()).toHaveLength(3);
    key("z", { ctrlKey: true, shiftKey: true });
    expect(shapes()).toHaveLength(2);
  });

  it("erases hit elements and autosaves", async () => {
    const { drag, key, shapes } = setup();
    key("l");
    drag(0, 50, 200, 50);
    key("o");
    drag(300, 300, 400, 380);
    key("e");
    drag(100, 40, 100, 60);
    expect(shapes()).toHaveLength(1);
    await act(() => new Promise((r) => setTimeout(r, 600)));
    expect(JSON.parse(localStorage.getItem("uni-tools:mini-draw:scene")!).elements).toHaveLength(1);
  });

  it("moves a selected element by dragging", () => {
    const { drag, key, svg } = setup();
    key("r");
    drag(0, 0, 100, 100);
    key("v");
    drag(0, 50, 50, 80); // grab left edge, move by (50,30)
    const rect = svg.querySelector("g[transform] > g > rect") as SVGRectElement;
    expect(rect.getAttribute("x")).toBe("50");
    expect(rect.getAttribute("y")).toBe("30");
  });
});
