export type DiffKind = "added" | "removed" | "changed";

export interface JsonDiff {
  kind: DiffKind;
  /** Path in the same format as TreeView, e.g. `$.tools[0].id`. */
  path: string;
  left?: unknown;
  right?: unknown;
}

export interface CompareOptions {
  /** Treat arrays as unordered sets of values (match equal items regardless of position). */
  ignoreArrayOrder?: boolean;
}

export interface CompareResult {
  diffs: JsonDiff[];
  added: number;
  removed: number;
  changed: number;
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

function walk(a: unknown, b: unknown, path: string, opts: CompareOptions, out: JsonDiff[]) {
  const ta = typeOf(a);
  const tb = typeOf(b);

  if (ta !== tb) {
    out.push({ kind: "changed", path, left: a, right: b });
    return;
  }

  if (ta === "object") {
    const oa = a as Record<string, unknown>;
    const ob = b as Record<string, unknown>;
    for (const k of Object.keys(oa)) {
      const p = `${path}.${k}`;
      if (!Object.prototype.hasOwnProperty.call(ob, k)) out.push({ kind: "removed", path: p, left: oa[k] });
      else walk(oa[k], ob[k], p, opts, out);
    }
    for (const k of Object.keys(ob)) {
      if (!Object.prototype.hasOwnProperty.call(oa, k)) out.push({ kind: "added", path: `${path}.${k}`, right: ob[k] });
    }
    return;
  }

  if (ta === "array") {
    const aa = a as unknown[];
    const ab = b as unknown[];
    if (opts.ignoreArrayOrder) {
      const remaining = ab.map((v, i) => ({ key: canonical(v), i, used: false }));
      const unmatchedLeft: number[] = [];
      aa.forEach((v, i) => {
        const key = canonical(v);
        const hit = remaining.find((r) => !r.used && r.key === key);
        if (hit) hit.used = true;
        else unmatchedLeft.push(i);
      });
      const unmatchedRight = remaining.filter((r) => !r.used).map((r) => r.i);
      for (const i of unmatchedLeft) out.push({ kind: "removed", path: `${path}[${i}]`, left: aa[i] });
      for (const i of unmatchedRight) out.push({ kind: "added", path: `${path}[${i}]`, right: ab[i] });
      return;
    }
    const n = Math.max(aa.length, ab.length);
    for (let i = 0; i < n; i++) {
      const p = `${path}[${i}]`;
      if (i >= ab.length) out.push({ kind: "removed", path: p, left: aa[i] });
      else if (i >= aa.length) out.push({ kind: "added", path: p, right: ab[i] });
      else walk(aa[i], ab[i], p, opts, out);
    }
    return;
  }

  if (a !== b) out.push({ kind: "changed", path, left: a, right: b });
}

/** Structural (semantic) comparison of two JSON values. Key order is ignored. */
export function compareValues(a: unknown, b: unknown, opts: CompareOptions = {}): CompareResult {
  const diffs: JsonDiff[] = [];
  walk(a, b, "$", opts, diffs);
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const d of diffs) {
    if (d.kind === "added") added++;
    else if (d.kind === "removed") removed++;
    else changed++;
  }
  return { diffs, added, removed, changed };
}

/** Parse both inputs and compare. Throws with a side-prefixed message on invalid JSON. */
export function compareJson(left: string, right: string, opts: CompareOptions = {}): CompareResult {
  let a: unknown;
  let b: unknown;
  try {
    a = JSON.parse(left);
  } catch (e) {
    throw new Error(`Left: ${(e as Error).message}`);
  }
  try {
    b = JSON.parse(right);
  } catch (e) {
    throw new Error(`Right: ${(e as Error).message}`);
  }
  return compareValues(a, b, opts);
}
