import { describe, expect, it } from "vitest";
import { canRedo, canUndo, createHistory, pushHistory, redo, undo } from "../history";

describe("history", () => {
  it("undoes and redoes", () => {
    let h = createHistory([] as number[]);
    h = pushHistory(h, [1]);
    h = pushHistory(h, [1, 2]);
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toEqual([1]);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present).toEqual([1, 2]);
    expect(canRedo(h)).toBe(false);
  });

  it("clears redo stack on push and ignores same-reference pushes", () => {
    const a = [1];
    let h = pushHistory(createHistory<number[]>([]), a);
    expect(pushHistory(h, a)).toBe(h);
    h = undo(h);
    h = pushHistory(h, [9]);
    expect(h.future).toEqual([]);
    expect(h.past).toEqual([[]]);
  });

  it("is a no-op at the ends and respects the limit", () => {
    const h0 = createHistory(0);
    expect(undo(h0)).toBe(h0);
    expect(redo(h0)).toBe(h0);
    let h = h0;
    for (let i = 1; i <= 10; i++) h = pushHistory(h, i, 3);
    expect(h.past).toEqual([7, 8, 9]);
  });
});
