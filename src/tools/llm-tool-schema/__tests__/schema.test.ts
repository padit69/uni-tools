import { describe, expect, it } from "vitest";
import {
  buildParameters,
  inferSchema,
  isValidToolName,
  mergeSchemas,
  toAnthropic,
  toGemini,
  toOpenAI,
} from "../schema";

describe("inferSchema", () => {
  it("infers primitives", () => {
    expect(inferSchema("x")).toEqual({ type: "string" });
    expect(inferSchema(3)).toEqual({ type: "integer" });
    expect(inferSchema(3.5)).toEqual({ type: "number" });
    expect(inferSchema(true)).toEqual({ type: "boolean" });
    expect(inferSchema(null)).toEqual({ type: "null" });
  });

  it("infers nested objects with all keys required", () => {
    expect(inferSchema({ city: "Hanoi", geo: { lat: 21.03, lng: 105.85 } })).toEqual({
      type: "object",
      properties: {
        city: { type: "string" },
        geo: {
          type: "object",
          properties: { lat: { type: "number" }, lng: { type: "number" } },
          required: ["lat", "lng"],
        },
      },
      required: ["city", "geo"],
    });
  });

  it("infers array item schemas and merges objects", () => {
    expect(inferSchema([])).toEqual({ type: "array", items: {} });
    expect(inferSchema([1, 2.5])).toEqual({ type: "array", items: { type: "number" } });
    expect(inferSchema([{ a: 1, b: "x" }, { a: 2 }])).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: { a: { type: "integer" }, b: { type: "string" } },
        required: ["a"],
      },
    });
    expect(inferSchema(["a", 1])).toEqual({ type: "array", items: { anyOf: [{ type: "string" }, { type: "integer" }] } });
  });

  it("merges into existing anyOf without duplicates", () => {
    const m = mergeSchemas({ anyOf: [{ type: "string" }, { type: "integer" }] }, { type: "number" });
    expect(m).toEqual({ anyOf: [{ type: "string" }, { type: "number" }] });
  });
});

describe("buildParameters", () => {
  it("rejects invalid or non-object samples", () => {
    expect(buildParameters("{").ok).toBe(false);
    expect(buildParameters("[1]")).toEqual({ ok: false, error: "notObject" });
  });

  it("applies required toggles and descriptions to top-level fields", () => {
    const r = buildParameters(`{"q":"x","limit":10}`, {
      required: { limit: false },
      descriptions: { q: " Search query " },
    });
    expect(r).toEqual({
      ok: true,
      schema: {
        type: "object",
        properties: { q: { type: "string", description: "Search query" }, limit: { type: "integer" } },
        required: ["q"],
      },
    });
  });
});

describe("wrappers", () => {
  const def = { name: "get_weather", description: "Get weather", parameters: { type: "object", properties: {}, required: [] } };
  it("wraps for OpenAI", () => {
    expect(toOpenAI(def)).toEqual({ type: "function", function: def });
  });
  it("wraps for Anthropic", () => {
    expect(toAnthropic(def)).toEqual({ name: "get_weather", description: "Get weather", input_schema: def.parameters });
  });
  it("wraps for Gemini", () => {
    expect(toGemini(def)).toEqual({ name: "get_weather", description: "Get weather", parameters: def.parameters });
  });
});

describe("isValidToolName", () => {
  it("validates the name pattern", () => {
    expect(isValidToolName("get_weather-v2")).toBe(true);
    expect(isValidToolName("")).toBe(false);
    expect(isValidToolName("has space")).toBe(false);
    expect(isValidToolName("a".repeat(64))).toBe(true);
    expect(isValidToolName("a".repeat(65))).toBe(false);
  });
});
