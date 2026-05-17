export type Lang = "c" | "cpp" | "java" | "js" | "python" | "json" | "shell" | "html";

export const LANG_LABEL: Record<Lang, string> = {
  c: "C",
  cpp: "C++",
  java: "Java",
  js: "JavaScript / TS",
  python: "Python",
  json: "JSON",
  shell: "Shell (double-quoted)",
  html: "HTML",
};

interface Rules {
  /** Quote char that gets escaped. */
  quote: '"' | "'";
  /** Simple sequence map (raw → escaped without leading backslash). */
  simple: Record<string, string>;
  /** Encode a code point < 0x20 or > 0x7e (i.e. control / non-ASCII). */
  encodeHigh: (cp: number) => string;
}

function pad(n: number, w: number) {
  return n.toString(16).padStart(w, "0");
}

const COMMON: Record<string, string> = {
  "\\": "\\\\",
  "\n": "\\n",
  "\t": "\\t",
  "\r": "\\r",
  "\b": "\\b",
  "\f": "\\f",
};

const RULES: Record<Exclude<Lang, "shell" | "html">, Rules> = {
  c: {
    quote: '"',
    simple: { ...COMMON, '"': '\\"', "\0": "\\0", "\v": "\\v" },
    encodeHigh: (cp) =>
      cp <= 0xff ? `\\x${pad(cp, 2)}` : cp <= 0xffff ? `\\u${pad(cp, 4)}` : `\\U${pad(cp, 8)}`,
  },
  cpp: {
    quote: '"',
    simple: { ...COMMON, '"': '\\"', "\0": "\\0", "\v": "\\v" },
    encodeHigh: (cp) =>
      cp <= 0xff ? `\\x${pad(cp, 2)}` : cp <= 0xffff ? `\\u${pad(cp, 4)}` : `\\U${pad(cp, 8)}`,
  },
  java: {
    quote: '"',
    simple: { ...COMMON, '"': '\\"', "\0": "\\0" },
    encodeHigh: (cp) => {
      if (cp <= 0xffff) return `\\u${pad(cp, 4)}`;
      const s = String.fromCodePoint(cp);
      return `\\u${pad(s.charCodeAt(0), 4)}\\u${pad(s.charCodeAt(1), 4)}`;
    },
  },
  js: {
    quote: '"',
    simple: { ...COMMON, '"': '\\"', "\0": "\\0", "\v": "\\v" },
    encodeHigh: (cp) => {
      if (cp <= 0xff) return `\\x${pad(cp, 2)}`;
      if (cp <= 0xffff) return `\\u${pad(cp, 4)}`;
      return `\\u{${cp.toString(16)}}`;
    },
  },
  python: {
    quote: '"',
    simple: { ...COMMON, '"': '\\"', "\0": "\\0", "\v": "\\v", "\x07": "\\a" },
    encodeHigh: (cp) => {
      if (cp <= 0xff) return `\\x${pad(cp, 2)}`;
      if (cp <= 0xffff) return `\\u${pad(cp, 4)}`;
      return `\\U${pad(cp, 8)}`;
    },
  },
  json: {
    quote: '"',
    simple: { ...COMMON, '"': '\\"', "/": "/" }, // forward slash optional
    encodeHigh: (cp) => {
      if (cp <= 0xffff) return `\\u${pad(cp, 4)}`;
      const s = String.fromCodePoint(cp);
      return `\\u${pad(s.charCodeAt(0), 4)}\\u${pad(s.charCodeAt(1), 4)}`;
    },
  },
};

function escapeStandard(input: string, lang: keyof typeof RULES): string {
  const r = RULES[lang];
  let out = "";
  for (const ch of input) {
    if (r.simple[ch] !== undefined) {
      out += r.simple[ch];
      continue;
    }
    const cp = ch.codePointAt(0)!;
    // JSON forbids unescaped control chars; otherwise leave printable ASCII as-is.
    const isControl = cp < 0x20 || cp === 0x7f;
    const isHigh = cp > 0x7e;
    if (lang === "json" ? isControl || isHigh : isControl) {
      out += r.encodeHigh(cp);
    } else if (isHigh && lang !== "json") {
      // leave non-ASCII as-is for languages that accept UTF-8 source by default
      out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}

function escapeShell(input: string): string {
  // double-quoted shell string: escape \, ", $, `
  let out = "";
  for (const ch of input) {
    if (ch === "\\" || ch === '"' || ch === "$" || ch === "`") {
      out += "\\" + ch;
    } else if (ch === "\n") {
      out += "\\n";
    } else {
      out += ch;
    }
  }
  return out;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escape(input: string, lang: Lang): string {
  if (lang === "shell") return escapeShell(input);
  if (lang === "html") return escapeHtml(input);
  return escapeStandard(input, lang);
}

/* ---------- Unescape ---------- */

const SIMPLE_DECODE: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0",
  a: "\x07",
  "\\": "\\",
  '"': '"',
  "'": "'",
  "/": "/",
  "?": "?",
  $: "$",
  "`": "`",
};

function unescapeStandard(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch !== "\\" || i + 1 >= input.length) {
      out += ch;
      i++;
      continue;
    }
    const next = input[i + 1];

    // \xHH
    if (next === "x") {
      const hex = input.slice(i + 2, i + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        out += String.fromCharCode(parseInt(hex, 16));
        i += 4;
        continue;
      }
    }
    // \uHHHH or \u{H+}
    if (next === "u") {
      if (input[i + 2] === "{") {
        const end = input.indexOf("}", i + 3);
        if (end > 0) {
          const hex = input.slice(i + 3, end);
          if (/^[0-9a-fA-F]+$/.test(hex)) {
            try {
              out += String.fromCodePoint(parseInt(hex, 16));
              i = end + 1;
              continue;
            } catch {
              /* fallthrough */
            }
          }
        }
      } else {
        const hex = input.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
      }
    }
    // \UHHHHHHHH (C/Python)
    if (next === "U") {
      const hex = input.slice(i + 2, i + 10);
      if (/^[0-9a-fA-F]{8}$/.test(hex)) {
        try {
          out += String.fromCodePoint(parseInt(hex, 16));
          i += 10;
          continue;
        } catch {
          /* fallthrough */
        }
      }
    }
    // \NNN (octal, 1-3 digits)
    if (/[0-7]/.test(next)) {
      let j = i + 1;
      let oct = "";
      while (j < input.length && oct.length < 3 && /[0-7]/.test(input[j])) {
        oct += input[j];
        j++;
      }
      // Treat \0 specially only as null when followed by non-digit (already handled by simple "0")
      if (oct.length > 1) {
        out += String.fromCharCode(parseInt(oct, 8));
        i = j;
        continue;
      }
    }
    // simple escapes
    if (SIMPLE_DECODE[next] !== undefined) {
      out += SIMPLE_DECODE[next];
      i += 2;
      continue;
    }
    // unknown escape — keep as-is
    out += next;
    i += 2;
  }
  return out;
}

function unescapeHtml(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function unescape(input: string, lang: Lang): string {
  if (lang === "html") return unescapeHtml(input);
  return unescapeStandard(input);
}
