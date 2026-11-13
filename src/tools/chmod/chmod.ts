/* Unix permission mode helpers. A mode is a 12-bit number (0o0000–0o7777). */

export type Who = "owner" | "group" | "other";
export type Perm = "read" | "write" | "execute";
export type Special = "setuid" | "setgid" | "sticky";

export const WHO: Who[] = ["owner", "group", "other"];
export const PERMS: Perm[] = ["read", "write", "execute"];
export const SPECIALS: Special[] = ["setuid", "setgid", "sticky"];

const WHO_SHIFT: Record<Who, number> = { owner: 6, group: 3, other: 0 };
const PERM_BIT: Record<Perm, number> = { read: 4, write: 2, execute: 1 };
const SPECIAL_BIT: Record<Special, number> = { setuid: 0o4000, setgid: 0o2000, sticky: 0o1000 };

export function permBit(who: Who, perm: Perm): number {
  return PERM_BIT[perm] << WHO_SHIFT[who];
}
export function specialBit(s: Special): number {
  return SPECIAL_BIT[s];
}
export function hasBit(mode: number, bit: number): boolean {
  return (mode & bit) !== 0;
}
export function toggleBit(mode: number, bit: number, on: boolean): number {
  return on ? mode | bit : mode & ~bit & 0o7777;
}

/** "755", or "4755" when any special bit is set. */
export function modeToOctal(mode: number): string {
  const s = (mode & 0o7777).toString(8);
  return mode & 0o7000 ? s.padStart(4, "0") : s.padStart(3, "0");
}

/** Accepts 1–4 octal digits (e.g. "7", "644", "0755", "4755"). Returns null when invalid. */
export function parseOctal(input: string): number | null {
  const s = input.trim();
  if (!/^[0-7]{1,4}$/.test(s)) return null;
  return parseInt(s, 8);
}

/** "rwxr-xr-x" with s/S (setuid/setgid) and t/T (sticky). */
export function modeToSymbolic(mode: number): string {
  let out = "";
  for (const who of WHO) {
    const r = hasBit(mode, permBit(who, "read")) ? "r" : "-";
    const w = hasBit(mode, permBit(who, "write")) ? "w" : "-";
    const x = hasBit(mode, permBit(who, "execute"));
    const special =
      who === "owner" ? hasBit(mode, 0o4000) : who === "group" ? hasBit(mode, 0o2000) : hasBit(mode, 0o1000);
    const sc = who === "other" ? "t" : "s";
    const xc = special ? (x ? sc : sc.toUpperCase()) : x ? "x" : "-";
    out += r + w + xc;
  }
  return out;
}

/**
 * Parses "rwxr-xr-x" (9 chars) or "-rwxr-xr-x" / "drwxr-xr-x" (10 chars, `ls -l` style, leading type char ignored).
 * Returns null when invalid.
 */
export function parseSymbolic(input: string): number | null {
  let s = input.trim();
  if (s.length === 10) {
    if (!/^[-dlcbps]$/.test(s[0])) return null;
    s = s.slice(1);
  }
  if (s.length !== 9) return null;
  let mode = 0;
  for (let i = 0; i < 3; i++) {
    const who = WHO[i];
    const [r, w, x] = s.slice(i * 3, i * 3 + 3);
    if (r === "r") mode |= permBit(who, "read");
    else if (r !== "-") return null;
    if (w === "w") mode |= permBit(who, "write");
    else if (w !== "-") return null;
    const sc = who === "other" ? "t" : "s";
    const sp = who === "owner" ? 0o4000 : who === "group" ? 0o2000 : 0o1000;
    if (x === "x") mode |= permBit(who, "execute");
    else if (x === sc) mode |= permBit(who, "execute") | sp;
    else if (x === sc.toUpperCase()) mode |= sp;
    else if (x !== "-") return null;
  }
  return mode;
}

/** chmod symbolic form, e.g. "u=rwx,g=rx,o=rx" (special bits as u+s/g+s/+t). */
export function modeToChmodSymbolic(mode: number): string {
  const letters: Record<Who, string> = { owner: "u", group: "g", other: "o" };
  const parts = WHO.map((who) => {
    let p = "";
    if (hasBit(mode, permBit(who, "read"))) p += "r";
    if (hasBit(mode, permBit(who, "write"))) p += "w";
    if (hasBit(mode, permBit(who, "execute"))) p += "x";
    if (who === "owner" && hasBit(mode, 0o4000)) p += "s";
    if (who === "group" && hasBit(mode, 0o2000)) p += "s";
    if (who === "other" && hasBit(mode, 0o1000)) p += "t";
    return `${letters[who]}=${p}`;
  });
  return parts.join(",");
}

/** Shell-quote a filename only when needed. */
export function shellQuote(name: string): string {
  if (name === "") return "file";
  if (/^[\w./@%+=:,-]+$/.test(name)) return name;
  return `'${name.replace(/'/g, `'\\''`)}'`;
}
