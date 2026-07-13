import { findNodeAtLocation, parseTree, type JSONPath } from "jsonc-parser";

export interface TextRange {
  from: number;
  to: number;
}

/** Convert a tree path like `$.tools[0].id` into a jsonc-parser JSONPath. */
export function pathToJsonPath(path: string): JSONPath {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "$") return [];

  const segments: JSONPath = [];
  let i = trimmed.startsWith("$") ? 1 : 0;

  while (i < trimmed.length) {
    const ch = trimmed[i];

    if (ch === ".") {
      i++;
      const start = i;
      while (i < trimmed.length && /[A-Za-z0-9_$-]/.test(trimmed[i])) i++;
      if (start === i) break;
      segments.push(trimmed.slice(start, i));
      continue;
    }

    if (ch === "[") {
      const end = trimmed.indexOf("]", i);
      if (end === -1) break;
      const raw = trimmed.slice(i + 1, end).trim();
      if (/^-?\d+$/.test(raw)) segments.push(Number(raw));
      i = end + 1;
      continue;
    }

    i++;
  }

  return segments;
}

/**
 * Locate the text range in `input` that corresponds to a JSONPath-style path.
 * Prefers the property node (key + value) when available so selecting an object
 * or array highlights the full block in the editor.
 */
export function locateJsonPath(input: string, path: string): TextRange | null {
  if (!input.trim()) return null;

  const tree = parseTree(input, undefined, {
    allowTrailingComma: false,
    disallowComments: true,
  });
  if (!tree) return null;

  const jsonPath = pathToJsonPath(path);
  const node = jsonPath.length === 0 ? tree : findNodeAtLocation(tree, jsonPath);
  if (!node) return null;

  const target = node.parent?.type === "property" ? node.parent : node;
  const from = target.offset;
  const to = target.offset + target.length;

  return { from, to };
}
