import { describe, it, expect } from "vitest";
import { convert, ConvertError } from "../convert";

describe("convert", () => {
  it("JSON → YAML preserves data", () => {
    const json = `{"name":"alice","tags":["a","b"]}`;
    const yaml = convert(json, "json", "yaml");
    expect(yaml).toContain("name: alice");
    expect(yaml).toContain("- a");
    expect(yaml).toContain("- b");
  });

  it("YAML → JSON round-trip", () => {
    const yaml = `name: alice\ntags:\n  - a\n  - b\n`;
    const json = convert(yaml, "yaml", "json");
    expect(JSON.parse(json)).toEqual({ name: "alice", tags: ["a", "b"] });
  });

  it("JSON array → CSV with header", () => {
    const json = `[{"name":"a","age":1},{"name":"b","age":2}]`;
    const csv = convert(json, "json", "csv");
    expect(csv.split(/\r?\n/)[0]).toBe("name,age");
    expect(csv).toContain("a,1");
    expect(csv).toContain("b,2");
  });

  it("CSV → JSON parses with dynamic typing", () => {
    const csv = `name,age\nalice,30\nbob,25`;
    const json = convert(csv, "csv", "json");
    expect(JSON.parse(json)).toEqual([
      { name: "alice", age: 30 },
      { name: "bob", age: 25 },
    ]);
  });

  it("JSON → XML wraps non-object root", () => {
    const json = `[1, 2, 3]`;
    const xml = convert(json, "json", "xml");
    expect(xml).toContain("<root>");
  });

  it("JSON → XML for plain object", () => {
    const json = `{"book":{"title":"abc"}}`;
    const xml = convert(json, "json", "xml");
    expect(xml).toContain("<book>");
    expect(xml).toContain("<title>abc</title>");
  });

  it("same-format pass-through", () => {
    expect(convert(`{"a":1}`, "json", "json")).toBe(`{"a":1}`);
  });

  it("throws ConvertError on invalid JSON input", () => {
    expect(() => convert(`not json`, "json", "yaml")).toThrow(ConvertError);
  });

  it("CSV roundtrip preserves array of objects", () => {
    const original = [{ a: 1, b: "x" }, { a: 2, b: "y" }];
    const csv = convert(JSON.stringify(original), "json", "csv");
    const back = JSON.parse(convert(csv, "csv", "json"));
    expect(back).toEqual(original);
  });
});
