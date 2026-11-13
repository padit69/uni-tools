import { describe, expect, it } from "vitest";
import {
  countChars,
  countWords,
  estimateChatTokens,
  estimateCost,
  estimateTokens,
  parseChatMessages,
} from "../estimate";

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates simple English close to ~1 token per short word", () => {
    expect(estimateTokens("Hello world")).toBe(2);
    expect(estimateTokens("The quick brown fox jumps over the lazy dog.")).toBe(10);
  });

  it("stays roughly near 4 chars/token for English prose", () => {
    const text =
      "Large language models process text as tokens. A token is often a word or part of a word, and English averages about four characters per token.";
    const ratio = text.length / estimateTokens(text);
    expect(ratio).toBeGreaterThan(3);
    expect(ratio).toBeLessThan(6);
  });

  it("weights Vietnamese, CJK and emoji more heavily per character", () => {
    expect(estimateTokens("Xin chào Việt Nam")).toBeGreaterThan(estimateTokens("Xin chao Viet Nam"));
    expect(estimateTokens("你好世界")).toBe(4);
    expect(estimateTokens("👍")).toBe(2);
  });

  it("is monotonic when appending text", () => {
    const samples = [
      "Hello, world! This is a test of 12345 numbers.\n  Indented line.",
      "Tiếng Việt có dấu: Điều này khá tốn token 🚀🚀",
      "const x = { a: [1, 2, 3] }; // 漢字 mix",
    ];
    for (const s of samples) {
      let prev = 0;
      const chars = Array.from(s);
      for (let i = 1; i <= chars.length; i++) {
        const n = estimateTokens(chars.slice(0, i).join(""));
        expect(n).toBeGreaterThanOrEqual(prev);
        prev = n;
      }
    }
  });
});

describe("counts", () => {
  it("counts characters by code point and words by whitespace", () => {
    expect(countChars("")).toBe(0);
    expect(countChars("a👍b")).toBe(3);
    expect(countWords("  hello   big world \n")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });
});

describe("chat messages", () => {
  it("parses arrays and {system, messages} objects", () => {
    expect(parseChatMessages("hello")).toBeNull();
    expect(parseChatMessages(`[{"foo":1}]`)).toBeNull();
    const m = parseChatMessages(`{"system":"Be brief","messages":[{"role":"user","content":[{"type":"text","text":"Hi"}]}]}`);
    expect(m).toEqual([
      { role: "system", text: "Be brief" },
      { role: "user", text: "Hi" },
    ]);
  });

  it("adds per-message overhead", () => {
    const msgs = [{ role: "user", text: "Hello world" }];
    expect(estimateChatTokens(msgs)).toBe(2 + 4 + 3);
    expect(estimateChatTokens([])).toBe(0);
  });
});

describe("estimateCost", () => {
  it("computes cost per 1M tokens", () => {
    expect(estimateCost(1_000_000, 500_000, 3, 15)).toBeCloseTo(10.5);
    expect(estimateCost(1000, 0, Number.NaN, 1)).toBe(0);
  });
});
