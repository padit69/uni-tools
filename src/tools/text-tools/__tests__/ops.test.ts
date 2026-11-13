import { describe, expect, it } from "vitest";
import { applyLineOp, computeStats, graphemes, unescapeSeparator } from "../ops";

describe("computeStats", () => {
  it("returns zeros for empty text", () => {
    expect(computeStats("")).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      sentences: 0,
      paragraphs: 0,
      bytes: 0,
      readingTimeMinutes: 0,
    });
  });

  it("counts basic stats", () => {
    const s = computeStats("Hello world. How are you?\n\nSecond para here.");
    expect(s.words).toBe(8);
    expect(s.lines).toBe(3);
    expect(s.paragraphs).toBe(2);
    expect(s.sentences).toBe(3);
    expect(s.characters).toBe(44);
    expect(s.charactersNoSpaces).toBe(36);
    expect(s.readingTimeMinutes).toBe(1);
  });

  it("counts graphemes and UTF-8 bytes correctly", () => {
    const s = computeStats("Tiếng Việt 👨‍👩‍👧");
    expect(s.characters).toBe(12);
    expect(s.bytes).toBe(new TextEncoder().encode("Tiếng Việt 👨‍👩‍👧").length);
    expect(graphemes("👍🏽a")).toEqual(["👍🏽", "a"]);
  });
});

describe("applyLineOp", () => {
  const text = "banana\nApple\ncherry\napple";

  it("sorts A→Z and Z→A", () => {
    expect(applyLineOp(text, "sortAsc", { caseInsensitive: true }).split("\n").map((l) => l.toLowerCase())).toEqual([
      "apple",
      "apple",
      "banana",
      "cherry",
    ]);
    expect(applyLineOp("b\na\nc", "sortDesc")).toBe("c\nb\na");
  });

  it("sorts naturally", () => {
    expect(applyLineOp("file10\nfile2\nfile1", "sortNatural")).toBe("file1\nfile2\nfile10");
  });

  it("sorts by length", () => {
    expect(applyLineOp("ccc\na\nbb", "sortLength")).toBe("a\nbb\nccc");
  });

  it("reverses lines", () => {
    expect(applyLineOp("1\n2\n3", "reverse")).toBe("3\n2\n1");
  });

  it("dedupes with and without case sensitivity", () => {
    expect(applyLineOp(text, "dedupe")).toBe(text);
    expect(applyLineOp(text, "dedupe", { caseInsensitive: true })).toBe("banana\nApple\ncherry");
  });

  it("removes empty lines and trims", () => {
    expect(applyLineOp("a\n\n  \nb", "removeEmpty")).toBe("a\nb");
    expect(applyLineOp("  a \n\tb", "trim")).toBe("a\nb");
  });

  it("shuffles deterministically with injected random", () => {
    const out = applyLineOp("1\n2\n3\n4", "shuffle", { random: () => 0 });
    expect(out.split("\n").sort()).toEqual(["1", "2", "3", "4"]);
    expect(out).toBe("2\n3\n4\n1");
  });

  it("adds padded line numbers", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `l${i}`).join("\n");
    const out = applyLineOp(lines, "number").split("\n");
    expect(out[0]).toBe(" 1. l0");
    expect(out[9]).toBe("10. l9");
  });

  it("joins and splits with custom separators", () => {
    expect(applyLineOp("a\nb\nc", "join", { separator: ", " })).toBe("a, b, c");
    expect(applyLineOp("a\nb", "join", { separator: "\\t" })).toBe("a\tb");
    expect(applyLineOp("a,b,c", "split", { separator: "," })).toBe("a\nb\nc");
    expect(applyLineOp("abc", "split", { separator: "" })).toBe("abc");
  });

  it("handles CRLF input", () => {
    expect(applyLineOp("b\r\na", "sortAsc")).toBe("a\nb");
  });
});

describe("unescapeSeparator", () => {
  it("interprets escapes", () => {
    expect(unescapeSeparator("\\n|\\t|\\\\")).toBe("\n|\t|\\");
  });
});
