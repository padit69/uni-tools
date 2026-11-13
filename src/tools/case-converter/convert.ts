/** Word splitting and case conversion helpers. */

export type CaseId =
  | "camel"
  | "pascal"
  | "snake"
  | "constant"
  | "kebab"
  | "train"
  | "dot"
  | "path"
  | "title"
  | "sentence"
  | "lower"
  | "upper"
  | "slug";

export const CASE_IDS: CaseId[] = [
  "camel",
  "pascal",
  "snake",
  "constant",
  "kebab",
  "train",
  "dot",
  "path",
  "title",
  "sentence",
  "lower",
  "upper",
  "slug",
];

/** Remove diacritics (Vietnamese included, đ/Đ → d/D). */
export function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFC");
}

/**
 * Split text into words. Handles separators (space, _, -, ., /, ...),
 * camelCase boundaries, acronyms ("XMLHttpRequest" → XML, Http, Request)
 * and numbers (digits stay attached to the preceding word: "utf8", "v2").
 */
export function splitWords(input: string): string[] {
  return input
    .normalize("NFC")
    .replace(/['’]/g, "")
    // lower/digit followed by upper: fooBar → foo Bar, v2Beta → v2 Beta
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2")
    // acronym followed by a capitalized word: XMLHttp → XML Http
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);

export function convertCase(input: string, id: CaseId): string {
  if (id === "lower") return input.toLowerCase();
  if (id === "upper") return input.toUpperCase();
  const src = id === "slug" ? stripDiacritics(input) : input;
  const words = splitWords(src);
  const lower = words.map((w) => w.toLowerCase());
  switch (id) {
    case "camel":
      return lower.map((w, i) => (i === 0 ? w : cap(w))).join("");
    case "pascal":
      return words.map(cap).join("");
    case "snake":
      return lower.join("_");
    case "constant":
      return words.map((w) => w.toUpperCase()).join("_");
    case "kebab":
      return lower.join("-");
    case "train":
      return words.map(cap).join("-");
    case "dot":
      return lower.join(".");
    case "path":
      return lower.join("/");
    case "title":
      return words.map(cap).join(" ");
    case "sentence":
      return lower.map((w, i) => (i === 0 ? cap(w) : w)).join(" ");
    case "slug":
      return lower
        .join("-")
        .replace(/[^a-z0-9-]+/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
  }
}

export interface ConvertOptions {
  lineByLine?: boolean;
  /** Strip diacritics before converting (slug always strips) */
  removeDiacritics?: boolean;
}

export function convertText(input: string, id: CaseId, opts: ConvertOptions = {}): string {
  const src = opts.removeDiacritics ? stripDiacritics(input) : input;
  if (opts.lineByLine) return src.split(/\r?\n/).map((l) => convertCase(l, id)).join("\n");
  return convertCase(src, id);
}
