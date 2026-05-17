import { parse, type ParseError } from "jsonc-parser";
import { formatJson, type Indent } from "./format";

export class JsonRepairError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonRepairError";
  }
}

function stripComments(input: string): string {
  let out = "";
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === "\"" || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < input.length && input[i] !== "\n") i++;
      out += "\n";
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i++;
      continue;
    }

    out += ch;
  }

  return out;
}

function singleQuotedToDoubleQuoted(input: string): string {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inDouble) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "\"") inDouble = false;
      continue;
    }

    if (inSingle) {
      if (escaped) {
        out += ch === "'" ? "'" : `\\${ch}`;
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "'") {
        out += "\"";
        inSingle = false;
      } else if (ch === "\"") {
        out += "\\\"";
      } else {
        out += ch;
      }
      continue;
    }

    if (ch === "\"") {
      inDouble = true;
      out += ch;
    } else if (ch === "'") {
      inSingle = true;
      out += "\"";
    } else {
      out += ch;
    }
  }

  return out;
}

function normalizeLooseJson(input: string): string {
  return singleQuotedToDoubleQuoted(stripComments(input))
    .replace(/^\uFEFF/, "")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/\bNaN\b/g, "null")
    .replace(/\bInfinity\b/g, "null");
}

export function repairJson(input: string, indent: Indent = 2): string {
  if (!input.trim()) return "";

  try {
    return formatJson(input, indent);
  } catch {
    // Continue with loose JSON repair below.
  }

  const normalized = normalizeLooseJson(input);
  const errors: ParseError[] = [];
  const parsed = parse(normalized, errors, {
    allowTrailingComma: true,
    disallowComments: false,
    allowEmptyContent: false,
  });

  if (errors.length > 0) {
    throw new JsonRepairError("Không thể repair JSON này tự động.");
  }

  return JSON.stringify(parsed, null, indent === "tab" ? "\t" : " ".repeat(indent));
}
