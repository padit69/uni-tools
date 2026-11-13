import { describe, expect, it } from "vitest";
import {
  addWorkspace, duplicateWorkspace, moveWorkspace, nextName, parseState, removeWorkspace, renameWorkspace,
  type WorkspaceState,
} from "../workspaces";

const s0: WorkspaceState = { list: [{ id: "a", name: "Board 1" }, { id: "b", name: "Board 2" }, { id: "c", name: "Ideas" }], activeId: "b" };

describe("workspaces", () => {
  it("names new boards with the smallest free number", () => {
    expect(nextName(s0.list, "Board")).toBe("Board 3");
    expect(nextName([{ id: "x", name: "Board 2" }], "Board")).toBe("Board 1");
  });

  it("adds and activates a workspace", () => {
    const s = addWorkspace(s0, "Board", "d");
    expect(s.list.at(-1)).toEqual({ id: "d", name: "Board 3" });
    expect(s.activeId).toBe("d");
  });

  it("renames, ignoring blank names", () => {
    expect(renameWorkspace(s0, "a", "  Flow  ").list[0].name).toBe("Flow");
    expect(renameWorkspace(s0, "a", "   ")).toBe(s0);
  });

  it("removes and activates the neighbour, never empties", () => {
    expect(removeWorkspace(s0, "b")).toEqual({ list: [s0.list[0], s0.list[2]], activeId: "c" });
    expect(removeWorkspace(s0, "c").activeId).toBe("b");
    const one = { list: [{ id: "a", name: "x" }], activeId: "a" };
    expect(removeWorkspace(one, "a")).toBe(one);
  });

  it("duplicates right after the source", () => {
    const s = duplicateWorkspace(s0, "a", "(copy)", "z");
    expect(s.list.map((w) => w.id)).toEqual(["a", "z", "b", "c"]);
    expect(s.list[1].name).toBe("Board 1 (copy)");
    expect(s.activeId).toBe("z");
  });

  it("reorders", () => {
    expect(moveWorkspace(s0, 0, 2).list.map((w) => w.id)).toEqual(["b", "c", "a"]);
    expect(moveWorkspace(s0, 0, 9)).toBe(s0);
  });

  it("parses stored state defensively", () => {
    expect(parseState(null)).toBeNull();
    expect(parseState("nope")).toBeNull();
    expect(parseState(JSON.stringify({ list: [] }))).toBeNull();
    expect(parseState(JSON.stringify({ list: [{ id: "a", name: "A" }, { id: "a", name: "dup" }, { bad: 1 }], activeId: "zz" }))).toEqual({
      list: [{ id: "a", name: "A" }],
      activeId: "a",
    });
  });
});
