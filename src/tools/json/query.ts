export class JsonQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonQueryError";
  }
}

type Segment =
  | { type: "key"; key: string }
  | { type: "index"; index: number }
  | { type: "wildcard" };

interface QueryMatch {
  path: string;
  value: unknown;
}

function parsePath(path: string): Segment[] {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "$") return [];
  if (!trimmed.startsWith("$")) {
    throw new JsonQueryError("Path phải bắt đầu bằng $");
  }

  const segments: Segment[] = [];
  let i = 1;
  while (i < trimmed.length) {
    const ch = trimmed[i];

    if (ch === ".") {
      i++;
      if (trimmed[i] === "*") {
        segments.push({ type: "wildcard" });
        i++;
        continue;
      }
      const start = i;
      while (i < trimmed.length && /[A-Za-z0-9_$-]/.test(trimmed[i])) i++;
      if (start === i) throw new JsonQueryError("Thiếu key sau dấu .");
      segments.push({ type: "key", key: trimmed.slice(start, i) });
      continue;
    }

    if (ch === "[") {
      const end = trimmed.indexOf("]", i);
      if (end === -1) throw new JsonQueryError("Thiếu dấu ]");
      const raw = trimmed.slice(i + 1, end).trim();
      if (raw === "*") {
        segments.push({ type: "wildcard" });
      } else if (/^-?\d+$/.test(raw)) {
        segments.push({ type: "index", index: Number(raw) });
      } else {
        const quoted = raw.match(/^(['"])(.*)\1$/);
        if (!quoted) throw new JsonQueryError("Bracket chỉ hỗ trợ index, *, hoặc key có quote");
        segments.push({ type: "key", key: quoted[2] });
      }
      i = end + 1;
      continue;
    }

    throw new JsonQueryError(`Ký tự không hợp lệ tại vị trí ${i + 1}`);
  }

  return segments;
}

function childPath(base: string, key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(key)
    ? `${base}.${key}`
    : `${base}[${JSON.stringify(key)}]`;
}

function applySegment(matches: QueryMatch[], segment: Segment): QueryMatch[] {
  const next: QueryMatch[] = [];
  for (const match of matches) {
    const value = match.value;

    if (segment.type === "key") {
      if (value && typeof value === "object" && !Array.isArray(value) && segment.key in value) {
        next.push({
          path: childPath(match.path, segment.key),
          value: (value as Record<string, unknown>)[segment.key],
        });
      }
      continue;
    }

    if (segment.type === "index") {
      if (Array.isArray(value)) {
        const index = segment.index < 0 ? value.length + segment.index : segment.index;
        if (index >= 0 && index < value.length) {
          next.push({ path: `${match.path}[${index}]`, value: value[index] });
        }
      }
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => next.push({ path: `${match.path}[${index}]`, value: item }));
    } else if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
        next.push({ path: childPath(match.path, key), value: item });
      });
    }
  }
  return next;
}

export function queryJson(input: string, path: string): string {
  if (!input.trim()) return "";
  const data = JSON.parse(input);
  const segments = parsePath(path);
  const matches = segments.reduce(applySegment, [{ path: "$", value: data }]);
  const result =
    matches.length === 1 && matches[0].path === path.trim()
      ? matches[0].value
      : matches.map((match) => ({ path: match.path, value: match.value }));
  return JSON.stringify(result, null, 2);
}

export interface JsonStats {
  objects: number;
  arrays: number;
  keys: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  maxDepth: number;
}

export function analyzeJson(input: string): JsonStats {
  const data = JSON.parse(input);
  const stats: JsonStats = {
    objects: 0,
    arrays: 0,
    keys: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    maxDepth: 0,
  };

  function visit(value: unknown, depth: number) {
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    if (value === null) {
      stats.nulls++;
    } else if (Array.isArray(value)) {
      stats.arrays++;
      value.forEach((item) => visit(item, depth + 1));
    } else if (typeof value === "object") {
      stats.objects++;
      const entries = Object.entries(value as Record<string, unknown>);
      stats.keys += entries.length;
      entries.forEach(([, item]) => visit(item, depth + 1));
    } else if (typeof value === "string") {
      stats.strings++;
    } else if (typeof value === "number") {
      stats.numbers++;
    } else if (typeof value === "boolean") {
      stats.booleans++;
    }
  }

  visit(data, 0);
  return stats;
}
