import { describe, expect, it } from "vitest";
import { repairJson } from "../repair";

describe("repairJson", () => {
  it("repairs comments and trailing commas", () => {
    expect(repairJson(`{\n  // note\n  "a": 1,\n}`)).toBe(`{\n  "a": 1\n}`);
  });

  it("repairs single quotes and Python literals", () => {
    expect(repairJson(`{'ok': True, 'value': None}`)).toBe(
      `{\n  "ok": true,\n  "value": null\n}`
    );
  });
});
