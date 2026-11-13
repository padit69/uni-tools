/** Arbitrary-precision number base conversion using BigInt. */

export class ParseError extends Error {}

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
const PREFIX: Record<string, number> = { "0x": 16, "0b": 2, "0o": 8 };

/**
 * Parse an integer string in the given base (2–36).
 * Accepts a leading sign, 0x/0b/0o prefixes (prefix wins over `base`),
 * and ignores underscores and whitespace. Returns null for empty input.
 */
export function parseBigInt(input: string, base: number): bigint | null {
  if (base < 2 || base > 36 || !Number.isInteger(base)) throw new ParseError(`Invalid base ${base}`);
  let s = input.replace(/[\s_]/g, "").toLowerCase();
  if (!s) return null;
  let negative = false;
  if (s[0] === "-" || s[0] === "+") {
    negative = s[0] === "-";
    s = s.slice(1);
  }
  const p = s.slice(0, 2);
  // a prefix is only meaningful if its letter is not a valid digit in `base`
  if (p in PREFIX && DIGITS.indexOf(p[1]) >= base) {
    base = PREFIX[p];
    s = s.slice(2);
  }
  if (!s) throw new ParseError("Missing digits");
  const b = BigInt(base);
  let n = 0n;
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) throw new ParseError(`Invalid digit "${ch}" for base ${base}`);
    n = n * b + BigInt(d);
  }
  return negative ? -n : n;
}

export function formatBigInt(n: bigint, base: number, upper = false): string {
  const s = (n < 0n ? "-" : "") + (n < 0n ? -n : n).toString(base);
  return upper ? s.toUpperCase() : s;
}

/** Number of bits needed for |n| (0 → 0). */
export function bitLength(n: bigint): number {
  const a = n < 0n ? -n : n;
  return a === 0n ? 0 : a.toString(2).length;
}

/** Smallest of 8/16/32/64/128/... bits that holds `n` as a signed two's complement value. */
export function signedWidth(n: bigint): number {
  let w = 8;
  while (n < -(1n << BigInt(w - 1)) || n >= 1n << BigInt(w - 1)) w *= 2;
  return w;
}

/** Two's complement bit string of n at the given width. */
export function twosComplement(n: bigint, width: number): string {
  const mod = 1n << BigInt(width);
  const v = ((n % mod) + mod) % mod;
  return v.toString(2).padStart(width, "0");
}

/** Group a bit string into nibbles (padded to a multiple of 4), e.g. "1 0101" → "0001 0101". */
export function groupBits(bits: string, size = 4): string {
  const pad = (size - (bits.length % size)) % size;
  const padded = "0".repeat(pad) + bits;
  const groups: string[] = [];
  for (let i = 0; i < padded.length; i += size) groups.push(padded.slice(i, i + size));
  return groups.join(" ");
}
