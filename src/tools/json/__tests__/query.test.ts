import { describe, expect, it } from "vitest";
import { analyzeJson, queryJson } from "../query";

const sample = `{"tools":[{"id":"json"},{"id":"base64"}],"meta":{"active":true}}`;

describe("queryJson", () => {
  it("reads a direct path", () => {
    expect(queryJson(sample, "$.meta.active")).toBe("true");
  });

  it("supports wildcard matches", () => {
    expect(JSON.parse(queryJson(sample, "$.tools[*].id"))).toEqual([
      { path: "$.tools[0].id", value: "json" },
      { path: "$.tools[1].id", value: "base64" },
    ]);
  });
});

describe("analyzeJson", () => {
  it("counts structure stats", () => {
    expect(analyzeJson(sample)).toMatchObject({
      objects: 4,
      arrays: 1,
      keys: 5,
      booleans: 1,
      strings: 2,
    });
  });
});
