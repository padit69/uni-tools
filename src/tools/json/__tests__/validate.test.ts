import { describe, it, expect } from "vitest";
import { validateJson } from "../validate";

describe("validateJson", () => {
  it("returns ok=true for valid JSON", () => {
    const r = validateJson(`{"a": 1}`);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.parsed).toEqual({ a: 1 });
  });

  it("reports line/col for invalid JSON", () => {
    const r = validateJson(`{"a":}`);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    const first = r.errors[0];
    expect(first.line).toBe(1);
    expect(first.col).toBeGreaterThan(0);
    expect(first.message).toBeTruthy();
    expect(first.code).toBeTruthy();
  });

  it("reports line correctly for multi-line input", () => {
    const r = validateJson(`{\n  "a": 1,\n  "b": ,\n}`);
    expect(r.ok).toBe(false);
    const errOnLine3 = r.errors.find((e) => e.line === 3);
    expect(errOnLine3).toBeDefined();
  });

  it("returns ok=false with empty errors for empty input", () => {
    const r = validateJson("");
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("rejects trailing comma (strict mode)", () => {
    const r = validateJson(`{"a": 1,}`);
    expect(r.ok).toBe(false);
  });
});
