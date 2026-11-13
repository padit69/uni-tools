/**
 * Heuristic token estimator (no tokenizer dependency).
 *
 * Real BPE tokenizers (cl100k / o200k / Claude / Gemini) differ, so this only
 * approximates them. The text is NFC-normalised, split into runs and each run
 * is weighted:
 *
 *  - ASCII word (a-z):            1 token up to 6 chars, then ~1 token / 5 chars
 *                                 (common English ≈ 4 chars/token incl. spaces)
 *  - Latin word with diacritics   ~1 token / 2 chars (Vietnamese, accented text
 *    (e.g. Vietnamese "Việt"):    splits into many byte-level pieces)
 *  - Other-script letters         ~1 token / 2 chars (Cyrillic, Greek, Thai…)
 *  - CJK ideographs / kana / hangul: 1 token per character
 *  - Emoji / pictographs:         2 tokens each
 *  - Digits:                      1 token per 3 digits
 *  - Punctuation / symbols:       1 token per 2 chars in a run (min 1)
 *  - Whitespace: a single space is merged with the next word (0); a run with a
 *    newline costs 1; longer space runs (indentation) cost 1 per 4 extra spaces.
 *
 * Every weight is non-decreasing in run length, so appending text never lowers
 * the estimate.
 */

const SEGMENT_RE =
  /(\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic}|[\uFE0F\u{1F3FB}-\u{1F3FF}])*)|([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])|(\s+)|(\p{Nd}+)|((?:(?![\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])[\p{L}\p{M}])+)|([^\s\p{L}\p{M}\p{Nd}])/gu;

export interface SegmentCounts {
  asciiWords: number;
  diacriticWords: number;
  otherWords: number;
  cjk: number;
  emoji: number;
  digits: number;
  punctuation: number;
  whitespace: number;
}

export function estimateTokens(text: string): number {
  return estimateDetailed(text).tokens;
}

export function estimateDetailed(text: string): { tokens: number; breakdown: SegmentCounts } {
  const breakdown: SegmentCounts = {
    asciiWords: 0,
    diacriticWords: 0,
    otherWords: 0,
    cjk: 0,
    emoji: 0,
    digits: 0,
    punctuation: 0,
    whitespace: 0,
  };
  if (!text) return { tokens: 0, breakdown };
  const s = text.normalize("NFC");
  let punctRun = 0;
  const flushPunct = () => {
    if (punctRun > 0) breakdown.punctuation += Math.ceil(punctRun / 2);
    punctRun = 0;
  };
  for (const m of s.matchAll(SEGMENT_RE)) {
    const [, emoji, cjk, ws, digits, word, punct] = m;
    if (punct !== undefined) {
      punctRun += 1;
      continue;
    }
    flushPunct();
    if (emoji !== undefined) breakdown.emoji += 2;
    else if (cjk !== undefined) breakdown.cjk += 1;
    else if (ws !== undefined) {
      if (ws.includes("\n")) breakdown.whitespace += 1;
      else if (ws.length > 1) breakdown.whitespace += Math.ceil((ws.length - 1) / 4);
    } else if (digits !== undefined) breakdown.digits += Math.ceil(digits.length / 3);
    else if (word !== undefined) {
      const len = Array.from(word).length;
      if (/^[A-Za-z]+$/.test(word)) breakdown.asciiWords += len <= 6 ? 1 : Math.ceil(len / 5);
      else if (/^[\p{Script=Latin}\p{M}]+$/u.test(word)) breakdown.diacriticWords += Math.max(1, Math.ceil(len / 2));
      else breakdown.otherWords += Math.max(1, Math.ceil(len / 2));
    }
  }
  flushPunct();
  const tokens = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { tokens, breakdown };
}

export function countChars(text: string): number {
  return Array.from(text).length;
}

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/* ---------- Chat messages ---------- */

export interface ChatMessage {
  role: string;
  text: string;
}

/** Parse an OpenAI/Anthropic-style messages array (or `{messages:[...]}`). Returns null if not chat JSON. */
export function parseChatMessages(input: string): ChatMessage[] | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }
  let system: string | null = null;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.system === "string") system = obj.system;
    data = obj.messages;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const out: ChatMessage[] = [];
  if (system !== null) out.push({ role: "system", text: system });
  for (const item of data) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (typeof role !== "string") return null;
    out.push({ role, text: contentToText(content) });
  }
  return out;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string") return (p as { text: string }).text;
        return "";
      })
      .join("\n");
  }
  if (content == null) return "";
  return JSON.stringify(content);
}

/** Per-message overhead (role + delimiters) and reply priming, as documented for OpenAI chat formats. */
export const MESSAGE_OVERHEAD = 4;
export const REPLY_PRIMING = 3;

export function estimateChatTokens(messages: ChatMessage[]): number {
  if (messages.length === 0) return 0;
  return messages.reduce((sum, m) => sum + MESSAGE_OVERHEAD + estimateTokens(m.text), 0) + REPLY_PRIMING;
}

/* ---------- Cost ---------- */

export function estimateCost(inputTokens: number, outputTokens: number, inPricePerM: number, outPricePerM: number): number {
  const i = Number.isFinite(inPricePerM) ? inPricePerM : 0;
  const o = Number.isFinite(outPricePerM) ? outPricePerM : 0;
  return (inputTokens * i + outputTokens * o) / 1_000_000;
}

/** Example prices (USD / 1M tokens). NOT authoritative — users must verify on the provider pricing page. */
export const PRICE_PRESETS: { id: string; label: string; input: number; output: number }[] = [
  { id: "gpt-4o", label: "GPT-4o", input: 2.5, output: 10 },
  { id: "gpt-4o-mini", label: "GPT-4o mini", input: 0.15, output: 0.6 },
  { id: "claude-sonnet", label: "Claude Sonnet", input: 3, output: 15 },
  { id: "claude-haiku", label: "Claude Haiku", input: 0.8, output: 4 },
  { id: "gemini-flash", label: "Gemini Flash", input: 0.1, output: 0.4 },
];

export const CONTEXT_PRESETS = [8192, 32768, 128000, 200000, 1000000];
