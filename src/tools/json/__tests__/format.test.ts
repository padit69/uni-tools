import { describe, it, expect } from "vitest";
import { formatJson, minifyJson, sortJson, JsonFormatError } from "../format";

describe("formatJson", () => {
  it("indent 2 spaces by default", () => {
    expect(formatJson(`{"a":1,"b":[1,2]}`)).toBe(
      `{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}`
    );
  });

  it("indent 4 spaces", () => {
    expect(formatJson(`{"a":1}`, 4)).toBe(`{\n    "a": 1\n}`);
  });

  it("indent tab", () => {
    expect(formatJson(`{"a":1}`, "tab")).toBe(`{\n\t"a": 1\n}`);
  });

  it("returns empty string for empty input", () => {
    expect(formatJson("")).toBe("");
    expect(formatJson("   ")).toBe("");
  });

  it("preserves unicode", () => {
    expect(formatJson(`{"name":"Việt Nam 🇻🇳"}`)).toContain("Việt Nam 🇻🇳");
  });

  it("throws JsonFormatError for invalid JSON", () => {
    expect(() => formatJson(`{a:1}`)).toThrow(JsonFormatError);
  });
});

describe("minifyJson", () => {
  it("strips all whitespace", () => {
    expect(minifyJson(`{\n  "a": 1\n}`)).toBe(`{"a":1}`);
  });

  it("returns empty string for empty input", () => {
    expect(minifyJson("")).toBe("");
  });

  it("throws for invalid", () => {
    expect(() => minifyJson(`not json`)).toThrow(JsonFormatError);
  });
});

describe("sortJson", () => {
  it("sorts object keys recursively", () => {
    expect(sortJson(`{"b":1,"a":{"d":4,"c":3}}`)).toBe(
      `{\n  "a": {\n    "c": 3,\n    "d": 4\n  },\n  "b": 1\n}`
    );
  });

  it("keeps array order while sorting nested objects", () => {
    expect(sortJson(`[{"b":2,"a":1}]`)).toBe(`[\n  {\n    "a": 1,\n    "b": 2\n  }\n]`);
  });
});
