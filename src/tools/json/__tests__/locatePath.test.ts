import { describe, expect, it } from "vitest";
import { locateJsonPath, pathToJsonPath } from "../locatePath";

const SAMPLE = `{
  "name": "uni-tools",
  "tools": [
    { "id": "json", "category": "json" },
    { "id": "base64", "category": "encode" }
  ],
  "active": true
}`;

describe("pathToJsonPath", () => {
  it("parses nested keys and indexes", () => {
    expect(pathToJsonPath("$.tools[0].id")).toEqual(["tools", 0, "id"]);
  });

  it("returns empty path for root", () => {
    expect(pathToJsonPath("$")).toEqual([]);
  });
});

describe("locateJsonPath", () => {
  it("finds a leaf property", () => {
    const range = locateJsonPath(SAMPLE, "$.name");
    expect(range).not.toBeNull();
    const slice = SAMPLE.slice(range!.from, range!.to);
    expect(slice).toContain('"name"');
    expect(slice).toContain("uni-tools");
  });

  it("finds a nested array item property", () => {
    const range = locateJsonPath(SAMPLE, "$.tools[1].id");
    expect(range).not.toBeNull();
    expect(SAMPLE.slice(range!.from, range!.to)).toContain("base64");
  });

  it("highlights the full object/array block", () => {
    const range = locateJsonPath(SAMPLE, "$.tools");
    expect(range).not.toBeNull();
    const slice = SAMPLE.slice(range!.from, range!.to);
    expect(slice).toContain('"tools"');
    expect(slice).toContain('"id": "json"');
    expect(slice).toContain('"id": "base64"');
    expect(slice.trimEnd().endsWith("]")).toBe(true);
  });

  it("highlights a full array element object", () => {
    const range = locateJsonPath(SAMPLE, "$.tools[0]");
    expect(range).not.toBeNull();
    const slice = SAMPLE.slice(range!.from, range!.to);
    expect(slice).toContain('"id": "json"');
    expect(slice).toContain('"category": "json"');
    expect(slice.trim().startsWith("{")).toBe(true);
    expect(slice.trim().endsWith("}")).toBe(true);
  });

  it("finds root", () => {
    const range = locateJsonPath(SAMPLE, "$");
    expect(range).not.toBeNull();
    expect(range!.from).toBe(0);
    expect(SAMPLE.slice(range!.from, range!.to).trim().endsWith("}")).toBe(true);
  });
});
