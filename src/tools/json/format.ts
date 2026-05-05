export type Indent = 2 | 4 | "tab";

export class JsonFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonFormatError";
  }
}

function indentString(indent: Indent): string {
  return indent === "tab" ? "\t" : " ".repeat(indent);
}

export function formatJson(input: string, indent: Indent = 2): string {
  if (!input.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(input), null, indentString(indent));
  } catch (e) {
    throw new JsonFormatError((e as Error).message);
  }
}

export function minifyJson(input: string): string {
  if (!input.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(input));
  } catch (e) {
    throw new JsonFormatError((e as Error).message);
  }
}
