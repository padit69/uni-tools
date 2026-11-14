import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useToolHistory } from "../useToolHistory";

beforeEach(() => localStorage.clear());

describe("useToolHistory", () => {
  it("stores action + output, newest first, dedupes same input+action", () => {
    const { result } = renderHook(() => useToolHistory("t", { max: 3 }));
    act(() => void result.current.push("{}", { action: "format", output: "{ }" }));
    act(() => void result.current.push("[]", { action: "minify", output: "[]" }));
    act(() => void result.current.push("{}", { action: "format", output: "{ }" }));
    expect(result.current.entries.map((e) => [e.input, e.action])).toEqual([["{}", "format"], ["[]", "minify"]]);
    act(() => void result.current.push("{}", { action: "save" }));
    expect(result.current.entries).toHaveLength(3);
    expect(result.current.entries[0]).toMatchObject({ input: "{}", action: "save" });
  });

  it("respects max and size limits, supports remove/clear", () => {
    const { result } = renderHook(() => useToolHistory("t", { max: 2, maxChars: 10 }));
    let ok = true;
    act(() => void (ok = result.current.push("x".repeat(11))));
    expect(ok).toBe(false);
    act(() => void result.current.push("a", { output: "y".repeat(20) }));
    expect(result.current.entries[0].output).toBeUndefined();
    act(() => void result.current.push("b"));
    act(() => void result.current.push("c"));
    expect(result.current.entries.map((e) => e.input)).toEqual(["c", "b"]);
    act(() => result.current.remove(result.current.entries[0].ts));
    expect(result.current.entries.map((e) => e.input)).toEqual(["b"]);
    act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
  });

  it("reads legacy entries without action", () => {
    localStorage.setItem("uni-tool:t:history", JSON.stringify([{ input: "{}", ts: 1 }]));
    const { result } = renderHook(() => useToolHistory("t"));
    expect(result.current.entries).toEqual([{ input: "{}", ts: 1 }]);
  });
});
