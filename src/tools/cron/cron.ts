/* Cron expression parser + next-run scheduler (local timezone). Pure logic, no deps. */

export type FieldKey = "second" | "minute" | "hour" | "dom" | "month" | "dow";

export interface FieldSpec {
  key: FieldKey;
  min: number;
  max: number;
  names?: Record<string, number>;
}

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const DOW_NAMES: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

export const FIELD_SPECS: Record<FieldKey, FieldSpec> = {
  second: { key: "second", min: 0, max: 59 },
  minute: { key: "minute", min: 0, max: 59 },
  hour: { key: "hour", min: 0, max: 23 },
  dom: { key: "dom", min: 1, max: 31 },
  month: { key: "month", min: 1, max: 12, names: MONTH_NAMES },
  // 7 is accepted as an alias for Sunday and normalized to 0.
  dow: { key: "dow", min: 0, max: 7, names: DOW_NAMES },
};

export const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

/** One comma-separated item of a field. */
export type Token =
  | { kind: "all" }
  | { kind: "value"; value: number }
  | { kind: "range"; from: number; to: number }
  | { kind: "step"; from: number; to: number; step: number; star: boolean };

export interface ParsedField {
  key: FieldKey;
  raw: string;
  tokens: Token[];
  values: number[]; // sorted, unique, normalized (dow 7 -> 0)
  /** Field starts with "*" or "?" — used for day-of-month / day-of-week semantics (Vixie cron). */
  star: boolean;
}

export interface ParsedCron {
  hasSeconds: boolean;
  macro?: string;
  expanded: string;
  fields: ParsedField[]; // second (always present; "0" when not given), minute, hour, dom, month, dow
  get: (k: FieldKey) => ParsedField;
}

export type CronErrorCode =
  | "empty"
  | "fieldCount"
  | "unknownMacro"
  | "invalidToken"
  | "outOfRange"
  | "invalidStep"
  | "invalidRange";

export class CronError extends Error {
  code: CronErrorCode;
  field?: FieldKey;
  value?: string;
  constructor(code: CronErrorCode, field?: FieldKey, value?: string) {
    super(`${code}${field ? ` [${field}]` : ""}${value !== undefined ? `: ${value}` : ""}`);
    this.code = code;
    this.field = field;
    this.value = value;
  }
}

function parseNumber(s: string, spec: FieldSpec, raw: string): number {
  const up = s.toUpperCase();
  if (spec.names && up in spec.names) return spec.names[up];
  if (!/^\d+$/.test(s)) throw new CronError("invalidToken", spec.key, raw);
  const n = Number(s);
  if (n < spec.min || n > spec.max) throw new CronError("outOfRange", spec.key, s);
  return n;
}

function parseField(raw: string, spec: FieldSpec): ParsedField {
  if (raw === "") throw new CronError("invalidToken", spec.key, raw);
  const tokens: Token[] = [];
  const set = new Set<number>();
  const add = (n: number) => set.add(spec.key === "dow" && n === 7 ? 0 : n);

  for (const part of raw.split(",")) {
    if (part === "") throw new CronError("invalidToken", spec.key, raw);
    const [base, stepStr, ...extra] = part.split("/");
    if (extra.length) throw new CronError("invalidToken", spec.key, part);
    let from: number;
    let to: number;
    let isStar = false;
    let isRange = false;
    if (base === "*" || (base === "?" && (spec.key === "dom" || spec.key === "dow"))) {
      from = spec.min;
      to = spec.key === "dow" ? 6 : spec.max;
      isStar = true;
    } else if (base.includes("-")) {
      const [a, b, ...more] = base.split("-");
      if (more.length || a === "" || b === "") throw new CronError("invalidToken", spec.key, part);
      from = parseNumber(a, spec, part);
      to = parseNumber(b, spec, part);
      if (from > to) throw new CronError("invalidRange", spec.key, part);
      isRange = true;
    } else {
      from = parseNumber(base, spec, part);
      to = from;
    }

    if (stepStr !== undefined) {
      if (!/^\d+$/.test(stepStr) || Number(stepStr) < 1) throw new CronError("invalidStep", spec.key, part);
      const step = Number(stepStr);
      // "a/n" means a..max stepping n
      if (!isStar && !isRange) to = spec.key === "dow" ? 6 : spec.max;
      if (step > spec.max - spec.min + 1) throw new CronError("invalidStep", spec.key, part);
      for (let v = from; v <= to; v += step) add(v);
      tokens.push({ kind: "step", from, to, step, star: isStar });
    } else if (isStar) {
      for (let v = from; v <= to; v++) add(v);
      tokens.push({ kind: "all" });
    } else if (isRange) {
      for (let v = from; v <= to; v++) add(v);
      tokens.push({ kind: "range", from, to });
    } else {
      add(from);
      tokens.push({ kind: "value", value: from });
    }
  }

  return {
    key: spec.key,
    raw,
    tokens,
    values: [...set].sort((a, b) => a - b),
    star: raw.startsWith("*") || raw.startsWith("?"),
  };
}

export function parseCron(input: string): ParsedCron {
  const trimmed = input.trim();
  if (!trimmed) throw new CronError("empty");
  let expr = trimmed;
  let macro: string | undefined;
  if (trimmed.startsWith("@")) {
    const m = trimmed.toLowerCase();
    if (!(m in MACROS)) throw new CronError("unknownMacro", undefined, trimmed);
    macro = m;
    expr = MACROS[m];
  }
  const parts = expr.split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) throw new CronError("fieldCount", undefined, String(parts.length));
  const hasSeconds = parts.length === 6;
  const keys: FieldKey[] = ["second", "minute", "hour", "dom", "month", "dow"];
  const raws = hasSeconds ? parts : ["0", ...parts];
  const fields = keys.map((k, i) => parseField(raws[i], FIELD_SPECS[k]));
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f])) as Record<FieldKey, ParsedField>;
  return { hasSeconds, macro, expanded: expr, fields, get: (k) => byKey[k] };
}

export function tryParseCron(input: string): { ok: true; cron: ParsedCron } | { ok: false; error: CronError } {
  try {
    return { ok: true, cron: parseCron(input) };
  } catch (e) {
    if (e instanceof CronError) return { ok: false, error: e };
    throw e;
  }
}

/** Day matches using standard cron semantics: if both DOM and DOW are restricted → OR, else AND. */
export function dayMatches(cron: ParsedCron, d: Date): boolean {
  const dom = cron.get("dom");
  const dow = cron.get("dow");
  const domOk = dom.values.includes(d.getDate());
  const dowOk = dow.values.includes(d.getDay());
  if (dom.star || dow.star) return domOk && dowOk;
  return domOk || dowOk;
}

const MAX_YEARS = 30;

/**
 * Compute the next `count` run times strictly after `from`, in the local timezone.
 * Nonexistent local times (DST spring-forward gaps) are skipped.
 */
export function nextRuns(cron: ParsedCron, from: Date, count: number): Date[] {
  const sec = new Set(cron.get("second").values);
  const min = new Set(cron.get("minute").values);
  const hr = new Set(cron.get("hour").values);
  const mon = new Set(cron.get("month").values);

  const out: Date[] = [];
  const d = new Date(from.getTime());
  d.setMilliseconds(0);
  d.setSeconds(d.getSeconds() + 1);
  const limitYear = from.getFullYear() + MAX_YEARS;
  let guard = 0;

  while (out.length < count) {
    if (d.getFullYear() > limitYear || ++guard > 2_000_000) break;
    const before = d.getTime();

    if (!mon.has(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
    } else if (!dayMatches(cron, d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
    } else if (!hr.has(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    } else if (!min.has(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    } else if (!sec.has(d.getSeconds())) {
      d.setSeconds(d.getSeconds() + 1, 0);
    } else {
      out.push(new Date(d.getTime()));
      d.setSeconds(d.getSeconds() + 1, 0);
    }

    // Safety: local-time setters around DST transitions must never move time backwards.
    if (d.getTime() <= before) d.setTime(before + 1000);
  }
  return out;
}

export const FIELD_ORDER_5: FieldKey[] = ["minute", "hour", "dom", "month", "dow"];
export const FIELD_ORDER_6: FieldKey[] = ["second", ...FIELD_ORDER_5];

// ---------- Human-readable description ----------

export type Translate = (key: string) => string;

function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

const pad = (n: number) => String(n).padStart(2, "0");

function valueLabel(key: FieldKey, n: number, t: Translate): string {
  if (key === "month") return t(`tool.cron.month.${n}`);
  if (key === "dow") return t(`tool.cron.dow.${n === 7 ? 0 : n}`);
  if (key === "hour") return pad(n);
  return String(n);
}

function tokenLabel(key: FieldKey, tok: Token, t: Translate): string {
  switch (tok.kind) {
    case "all":
      return t("tool.cron.desc.any");
    case "value":
      return valueLabel(key, tok.value, t);
    case "range":
      return `${valueLabel(key, tok.from, t)}–${valueLabel(key, tok.to, t)}`;
    case "step":
      return fmt(t("tool.cron.desc.stepRange"), {
        n: tok.step,
        from: valueLabel(key, tok.from, t),
        to: valueLabel(key, tok.to, t),
      });
  }
}

function listLabel(field: ParsedField, t: Translate): string {
  return field.tokens.map((tok) => tokenLabel(field.key, tok, t)).join(", ");
}

/** "*\/n" alone → n, otherwise null */
function simpleEvery(field: ParsedField): number | null {
  if (field.tokens.length === 1) {
    const tok = field.tokens[0];
    if (tok.kind === "step" && tok.star) return tok.step;
  }
  return null;
}

const isAll = (f: ParsedField) => f.tokens.length === 1 && f.tokens[0].kind === "all";
const single = (f: ParsedField): number | null =>
  f.tokens.length === 1 && f.tokens[0].kind === "value" ? f.tokens[0].value : null;

function unitPhrase(field: ParsedField, t: Translate, unit: "second" | "minute" | "hour"): string | null {
  if (isAll(field)) return t(`tool.cron.desc.every_${unit}`);
  const every = simpleEvery(field);
  if (every !== null) return fmt(t(`tool.cron.desc.everyN_${unit}`), { n: every });
  return fmt(t(`tool.cron.desc.at_${unit}`), { list: listLabel(field, t) });
}

export function describeCron(cron: ParsedCron, t: Translate): string {
  const s = cron.get("second");
  const m = cron.get("minute");
  const h = cron.get("hour");
  const dom = cron.get("dom");
  const mon = cron.get("month");
  const dow = cron.get("dow");
  const parts: string[] = [];

  const sv = single(s);
  const mv = single(m);

  // Time of day
  const simpleTimes = (() => {
    // Exact times: seconds single, minutes & hours are plain values with small product
    if (sv === null) return null;
    const mVals = m.tokens.every((x) => x.kind === "value") ? m.values : null;
    const hVals = h.tokens.every((x) => x.kind === "value") ? h.values : null;
    if (!mVals || !hVals || mVals.length * hVals.length > 6) return null;
    const times: string[] = [];
    for (const hh of hVals) for (const mm of mVals) times.push(`${pad(hh)}:${pad(mm)}${sv !== 0 || cron.hasSeconds ? `:${pad(sv)}` : ""}`);
    return times;
  })();

  if (simpleTimes) {
    parts.push(fmt(t("tool.cron.desc.atTime"), { list: simpleTimes.join(", ") }));
  } else {
    if (cron.hasSeconds && sv !== 0) parts.push(unitPhrase(s, t, "second")!);
    const secondsCoverMinutes = cron.hasSeconds && sv === null && isAll(m);
    if (!secondsCoverMinutes) parts.push(unitPhrase(m, t, "minute")!);
    if (isAll(h)) {
      if (mv !== null) parts.push(t("tool.cron.desc.everyHour"));
    } else {
      parts.push(unitPhrase(h, t, "hour")!);
    }
  }

  // Days
  const domRestricted = !dom.star;
  const dowRestricted = !dow.star;
  const domPhrase = () => {
    const every = simpleEvery(dom);
    if (every !== null) return fmt(t("tool.cron.desc.everyN_day"), { n: every });
    return fmt(t("tool.cron.desc.onDom"), { list: listLabel(dom, t) });
  };
  const dowPhrase = () => fmt(t("tool.cron.desc.onDow"), { list: listLabel(dow, t) });

  if (domRestricted && dowRestricted) {
    parts.push(`${domPhrase()} ${t("tool.cron.desc.or")} ${dowPhrase()}`);
  } else {
    if (!isAll(dom)) parts.push(domPhrase());
    if (!isAll(dow)) parts.push(dowPhrase());
  }

  // Months
  if (!isAll(mon)) {
    const every = simpleEvery(mon);
    parts.push(
      every !== null
        ? fmt(t("tool.cron.desc.everyN_month"), { n: every })
        : fmt(t("tool.cron.desc.inMonth"), { list: listLabel(mon, t) }),
    );
  }

  const sentence = parts.filter(Boolean).join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Expanded values of a field as a short display string. */
export function fieldValuesLabel(field: ParsedField, maxItems = 24): string {
  const v = field.values;
  if (v.length <= maxItems) return v.join(", ");
  return `${v.slice(0, maxItems).join(", ")}, … (${v.length})`;
}
