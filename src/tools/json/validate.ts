import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";

export interface ValidationError {
  line: number;
  col: number;
  offset: number;
  length: number;
  message: string;
  code: string;
}

// jsonc-parser exports ParseErrorCode as a const enum, which can't be
// reverse-looked-up under isolatedModules. Inline the mapping.
const ERROR_NAMES: Record<number, string> = {
  1: "InvalidSymbol",
  2: "InvalidNumberFormat",
  3: "PropertyNameExpected",
  4: "ValueExpected",
  5: "ColonExpected",
  6: "CommaExpected",
  7: "CloseBraceExpected",
  8: "CloseBracketExpected",
  9: "EndOfFileExpected",
  10: "InvalidCommentToken",
  11: "UnexpectedEndOfComment",
  12: "UnexpectedEndOfString",
  13: "UnexpectedEndOfNumber",
  14: "InvalidUnicode",
  15: "InvalidEscapeCharacter",
  16: "InvalidCharacter",
};

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  parsed?: unknown;
}

function offsetToLineCol(input: string, offset: number): { line: number; col: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < input.length; i++) {
    if (input.charCodeAt(i) === 10) {
      line++;
      lastNewline = i;
    }
  }
  return { line, col: offset - lastNewline };
}

export function validateJson(input: string): ValidationResult {
  if (!input.trim()) return { ok: false, errors: [] };

  const errors: ParseError[] = [];
  const parsed = parse(input, errors, {
    allowTrailingComma: false,
    disallowComments: true,
  });

  if (errors.length === 0) {
    return { ok: true, errors: [], parsed };
  }

  const mapped: ValidationError[] = errors.map((e) => {
    const { line, col } = offsetToLineCol(input, e.offset);
    return {
      line,
      col,
      offset: e.offset,
      length: e.length,
      message: printParseErrorCode(e.error),
      code: ERROR_NAMES[e.error] ?? `code-${e.error}`,
    };
  });

  return { ok: false, errors: mapped };
}
