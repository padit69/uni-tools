export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  bytes: number;
  readingTimeMinutes: number;
}

type SegmenterLike = { segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }> };

function getSegmenter(granularity: "grapheme" | "word" | "sentence"): SegmenterLike | null {
  const Seg = (Intl as unknown as { Segmenter?: new (locale?: string, opts?: { granularity: string }) => SegmenterLike }).Segmenter;
  if (typeof Seg !== "function") return null;
  try {
    return new Seg(undefined, { granularity });
  } catch {
    return null;
  }
}

/** Splits text into user-perceived characters (grapheme clusters). */
export function graphemes(text: string): string[] {
  const seg = getSegmenter("grapheme");
  if (seg) return Array.from(seg.segment(text), (s) => s.segment);
  return Array.from(text);
}

export function countWords(text: string): number {
  const seg = getSegmenter("word");
  if (seg) {
    let n = 0;
    for (const s of seg.segment(text)) if (s.isWordLike) n++;
    return n;
  }
  const m = text.match(/[\p{L}\p{N}_'’-]+/gu);
  return m ? m.length : 0;
}

export function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const seg = getSegmenter("sentence");
  if (seg) {
    let n = 0;
    for (const s of seg.segment(text)) if (s.segment.trim()) n++;
    return n;
  }
  return text.split(/(?<=[.!?…。！？])\s+/u).filter((s) => s.trim()).length;
}

export function computeStats(text: string, wordsPerMinute = 200): TextStats {
  const g = graphemes(text);
  const words = countWords(text);
  return {
    characters: g.length,
    charactersNoSpaces: g.filter((c) => !/^\s+$/u.test(c)).length,
    words,
    lines: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    sentences: countSentences(text),
    paragraphs: text.trim() === "" ? 0 : text.split(/(?:\r?\n[ \t]*){2,}/).filter((p) => p.trim()).length,
    bytes: new TextEncoder().encode(text).length,
    readingTimeMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / wordsPerMinute)),
  };
}

export type LineOp =
  | "sortAsc"
  | "sortDesc"
  | "sortNatural"
  | "sortLength"
  | "reverse"
  | "dedupe"
  | "removeEmpty"
  | "trim"
  | "shuffle"
  | "number"
  | "join"
  | "split";

export interface LineOpOptions {
  caseInsensitive?: boolean;
  separator?: string;
  /** Injected for deterministic tests. */
  random?: () => number;
}

export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

/** Interprets escape sequences like \n and \t in a user-entered separator. */
export function unescapeSeparator(sep: string): string {
  return sep.replace(/\\(n|t|r|\\)/g, (_, c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : c === "r" ? "\r" : "\\"));
}

export function applyLineOp(text: string, op: LineOp, opts: LineOpOptions = {}): string {
  const ci = !!opts.caseInsensitive;
  const key = (s: string) => (ci ? s.toLocaleLowerCase() : s);
  const lines = splitLines(text);
  const sensitivity = ci ? "base" : "variant";
  const cmp = (a: string, b: string) => {
    const r = a.localeCompare(b, undefined, { sensitivity });
    if (r !== 0 || ci) return r;
    return a < b ? -1 : a > b ? 1 : 0;
  };
  switch (op) {
    case "sortAsc":
      return [...lines].sort(cmp).join("\n");
    case "sortDesc":
      return [...lines].sort((a, b) => cmp(b, a)).join("\n");
    case "sortNatural": {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity });
      return [...lines].sort((a, b) => collator.compare(a, b)).join("\n");
    }
    case "sortLength":
      return [...lines].sort((a, b) => graphemes(a).length - graphemes(b).length).join("\n");
    case "reverse":
      return [...lines].reverse().join("\n");
    case "dedupe": {
      const seen = new Set<string>();
      return lines
        .filter((l) => {
          const k = key(l);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .join("\n");
    }
    case "removeEmpty":
      return lines.filter((l) => l.trim() !== "").join("\n");
    case "trim":
      return lines.map((l) => l.trim()).join("\n");
    case "shuffle": {
      const rnd = opts.random ?? Math.random;
      const arr = [...lines];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.join("\n");
    }
    case "number": {
      const width = String(lines.length).length;
      return lines.map((l, i) => `${String(i + 1).padStart(width, " ")}. ${l}`).join("\n");
    }
    case "join":
      return lines.join(unescapeSeparator(opts.separator ?? ", "));
    case "split": {
      const sep = unescapeSeparator(opts.separator ?? ",");
      if (!sep) return text;
      return text.split(sep).join("\n");
    }
  }
}
