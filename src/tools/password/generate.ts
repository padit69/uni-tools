export const CHARSET = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digit: "0123456789",
  symbol: "!@#$%^&*()-_=+[]{};:,.<>?/~",
} as const;

const AMBIGUOUS = new Set("0O1lI|`'\"{}[]()/\\");

export interface RandomOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
  excludeAmbiguous: boolean;
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

/** Unbiased random integer in [0, max). Uses crypto.getRandomValues. */
export function secureRandomInt(max: number): number {
  if (max <= 0) throw new Error("max must be positive");
  const arr = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  while (true) {
    crypto.getRandomValues(arr);
    if (arr[0] < limit) return arr[0] % max;
  }
}

export function buildCharset(opts: RandomOptions): string {
  let chars = "";
  if (opts.lower) chars += CHARSET.lower;
  if (opts.upper) chars += CHARSET.upper;
  if (opts.digit) chars += CHARSET.digit;
  if (opts.symbol) chars += CHARSET.symbol;
  if (opts.excludeAmbiguous) {
    chars = Array.from(chars)
      .filter((c) => !AMBIGUOUS.has(c))
      .join("");
  }
  return chars;
}

export function generatePassword(opts: RandomOptions): string {
  const chars = buildCharset(opts);
  if (!chars) throw new Error("Phải chọn ít nhất một loại ký tự");
  const len = Math.max(1, Math.min(256, Math.floor(opts.length)));
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[secureRandomInt(chars.length)];
  }
  return out;
}

export function generatePassphrase(opts: PassphraseOptions, list: string[]): string {
  const n = Math.max(1, Math.min(20, Math.floor(opts.words)));
  const words: string[] = [];
  for (let i = 0; i < n; i++) {
    let w = list[secureRandomInt(list.length)];
    if (opts.capitalize) w = w[0].toUpperCase() + w.slice(1);
    words.push(w);
  }
  let pass = words.join(opts.separator);
  if (opts.includeNumber) {
    pass += String(secureRandomInt(100)).padStart(2, "0");
  }
  return pass;
}

/** Shannon entropy in bits = length * log2(charsetSize). */
export function entropyBits(password: string, charsetSize: number): number {
  if (!password || charsetSize <= 1) return 0;
  return password.length * Math.log2(charsetSize);
}

export type Strength = "very-weak" | "weak" | "fair" | "strong" | "very-strong";

export function rateStrength(bits: number): Strength {
  if (bits < 28) return "very-weak";
  if (bits < 40) return "weak";
  if (bits < 60) return "fair";
  if (bits < 80) return "strong";
  return "very-strong";
}
