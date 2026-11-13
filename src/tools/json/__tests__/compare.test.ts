import { describe, expect, it } from "vitest";
import { compareJson } from "../compare";

describe("compareJson", () => {
  it("returns no diffs for equal JSON with different key order", () => {
    const r = compareJson(`{"a":1,"b":{"c":[1,2]}}`, `{"b":{"c":[1,2]},"a":1}`);
    expect(r.diffs).toEqual([]);
  });

  it("detects added, removed and changed keys", () => {
    const r = compareJson(`{"a":1,"b":2,"c":{"d":true}}`, `{"a":1,"c":{"d":false},"e":"x"}`);
    expect(r.diffs).toEqual([
      { kind: "removed", path: "$.b", left: 2 },
      { kind: "changed", path: "$.c.d", left: true, right: false },
      { kind: "added", path: "$.e", right: "x" },
    ]);
    expect([r.added, r.removed, r.changed]).toEqual([1, 1, 1]);
  });

  it("reports type changes at the node", () => {
    const r = compareJson(`{"a":[1]}`, `{"a":{"0":1}}`);
    expect(r.diffs).toEqual([{ kind: "changed", path: "$.a", left: [1], right: { "0": 1 } }]);
  });

  it("compares arrays by index", () => {
    const r = compareJson(`[1,2,3]`, `[1,5]`);
    expect(r.diffs).toEqual([
      { kind: "changed", path: "$[1]", left: 2, right: 5 },
      { kind: "removed", path: "$[2]", left: 3 },
    ]);
  });

  it("can ignore array order", () => {
    const r = compareJson(`[{"id":1},{"id":2}]`, `[{"id":2},{"id":1}]`, { ignoreArrayOrder: true });
    expect(r.diffs).toEqual([]);
  });

  it("throws with side prefix on invalid input", () => {
    expect(() => compareJson(`{`, `{}`)).toThrow(/^Left:/);
    expect(() => compareJson(`{}`, `nope`)).toThrow(/^Right:/);
  });
});
