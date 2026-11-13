import { describe, expect, it } from "vitest";
import { CronError, describeCron, nextRuns, parseCron, tryParseCron } from "../cron";

// Local-time helpers so tests are timezone-independent (except the DST file).
const L = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ` +
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
const runs = (expr: string, from: Date, n = 5) => nextRuns(parseCron(expr), from, n).map(fmt);

describe("parseCron", () => {
  it("parses 5-field expressions with implicit second 0", () => {
    const c = parseCron("*/15 9-17 * * 1-5");
    expect(c.hasSeconds).toBe(false);
    expect(c.get("second").values).toEqual([0]);
    expect(c.get("minute").values).toEqual([0, 15, 30, 45]);
    expect(c.get("hour").values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(c.get("dow").values).toEqual([1, 2, 3, 4, 5]);
  });

  it("parses 6-field expressions with seconds", () => {
    const c = parseCron("*/20 * * * * *");
    expect(c.hasSeconds).toBe(true);
    expect(c.get("second").values).toEqual([0, 20, 40]);
  });

  it("supports lists, ranges, steps and range steps", () => {
    const c = parseCron("1,5,10-12,30-40/5 * * * *");
    expect(c.get("minute").values).toEqual([1, 5, 10, 11, 12, 30, 35, 40]);
  });

  it("supports 'a/n' as a..max", () => {
    expect(parseCron("5/20 * * * *").get("minute").values).toEqual([5, 25, 45]);
  });

  it("supports month and day names (case-insensitive)", () => {
    const c = parseCron("0 0 * jan,Mar-MAY mon-FRI");
    expect(c.get("month").values).toEqual([1, 3, 4, 5]);
    expect(c.get("dow").values).toEqual([1, 2, 3, 4, 5]);
  });

  it("normalizes day-of-week 7 to Sunday", () => {
    expect(parseCron("0 0 * * 7").get("dow").values).toEqual([0]);
    expect(parseCron("0 0 * * 5-7").get("dow").values).toEqual([0, 5, 6]);
  });

  it("expands macros", () => {
    expect(parseCron("@daily").expanded).toBe("0 0 * * *");
    expect(parseCron("@hourly").expanded).toBe("0 * * * *");
    expect(parseCron("@weekly").expanded).toBe("0 0 * * 0");
    expect(parseCron("@monthly").expanded).toBe("0 0 1 * *");
    expect(parseCron("@yearly").expanded).toBe("0 0 1 1 *");
    expect(parseCron("@ANNUALLY").macro).toBe("@annually");
  });

  it("tolerates extra whitespace", () => {
    expect(parseCron("  0   12  * * *  ").get("hour").values).toEqual([12]);
  });

  it.each([
    ["", "empty"],
    ["* * * *", "fieldCount"],
    ["* * * * * * *", "fieldCount"],
    ["@reboot", "unknownMacro"],
    ["60 * * * *", "outOfRange"],
    ["* 24 * * *", "outOfRange"],
    ["* * 0 * *", "outOfRange"],
    ["* * 32 * *", "outOfRange"],
    ["* * * 13 *", "outOfRange"],
    ["* * * * 8", "outOfRange"],
    ["*/0 * * * *", "invalidStep"],
    ["*/x * * * *", "invalidStep"],
    ["*/61 * * * *", "invalidStep"],
    ["10-5 * * * *", "invalidRange"],
    ["abc * * * *", "invalidToken"],
    ["1,,2 * * * *", "invalidToken"],
    ["1-2-3 * * * *", "invalidToken"],
    ["* * * FOO *", "invalidToken"],
  ])("rejects %j with %s", (expr, code) => {
    const r = tryParseCron(expr);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(CronError);
      expect(r.error.code).toBe(code);
    }
  });

  it("reports the offending field", () => {
    const r = tryParseCron("0 25 * * *");
    expect(r.ok).toBe(false);
    if (!r.ok) expect([r.error.field, r.error.value]).toEqual(["hour", "25"]);
  });
});

describe("nextRuns", () => {
  it("every minute", () => {
    expect(runs("* * * * *", L(2024, 1, 1, 10, 0, 30), 3)).toEqual([
      "2024-01-01 10:01:00",
      "2024-01-01 10:02:00",
      "2024-01-01 10:03:00",
    ]);
  });

  it("is strictly after 'from' even when 'from' matches exactly", () => {
    expect(runs("0 12 * * *", L(2024, 1, 1, 12, 0, 0), 2)).toEqual(["2024-01-02 12:00:00", "2024-01-03 12:00:00"]);
  });

  it("ignores milliseconds in 'from'", () => {
    const from = new Date(2024, 0, 1, 11, 59, 59, 999);
    expect(runs("0 12 * * *", from, 1)).toEqual(["2024-01-01 12:00:00"]);
  });

  it("every 15 minutes during working hours on weekdays", () => {
    // 2024-01-05 is a Friday
    expect(runs("*/15 9-17 * * 1-5", L(2024, 1, 5, 17, 50), 3)).toEqual([
      "2024-01-08 09:00:00",
      "2024-01-08 09:15:00",
      "2024-01-08 09:30:00",
    ]);
  });

  it("daily macro", () => {
    expect(runs("@daily", L(2024, 2, 28, 5), 3)).toEqual([
      "2024-02-29 00:00:00",
      "2024-03-01 00:00:00",
      "2024-03-02 00:00:00",
    ]);
  });

  it("hourly macro", () => {
    expect(runs("@hourly", L(2024, 12, 31, 23, 30), 2)).toEqual(["2025-01-01 00:00:00", "2025-01-01 01:00:00"]);
  });

  it("weekly on Sunday (0 and 7 equivalent)", () => {
    // 2024-01-03 is a Wednesday → next Sunday is 2024-01-07
    expect(runs("0 0 * * 0", L(2024, 1, 3), 2)).toEqual(["2024-01-07 00:00:00", "2024-01-14 00:00:00"]);
    expect(runs("0 0 * * 7", L(2024, 1, 3), 2)).toEqual(["2024-01-07 00:00:00", "2024-01-14 00:00:00"]);
    expect(runs("0 0 * * SUN", L(2024, 1, 3), 1)).toEqual(["2024-01-07 00:00:00"]);
  });

  it("monthly on the 31st skips short months", () => {
    expect(runs("0 0 31 * *", L(2024, 1, 31, 1), 4)).toEqual([
      "2024-03-31 00:00:00",
      "2024-05-31 00:00:00",
      "2024-07-31 00:00:00",
      "2024-08-31 00:00:00",
    ]);
  });

  it("Feb 29 only in leap years", () => {
    expect(runs("0 0 29 2 *", L(2024, 3, 1), 2)).toEqual(["2028-02-29 00:00:00", "2032-02-29 00:00:00"]);
  });

  it("Feb 29 across the non-leap year 2100", () => {
    expect(runs("0 0 29 2 *", L(2097, 1, 1), 1)).toEqual(["2104-02-29 00:00:00"]);
  });

  it("returns empty for impossible dates (Feb 30)", () => {
    expect(runs("0 0 30 2 *", L(2024, 1, 1), 3)).toEqual([]);
  });

  it("uses OR semantics when both day-of-month and day-of-week are restricted", () => {
    // 1st and 15th of the month OR any Monday. Jan 2024: Mon 1, Mon 8, 15 (Mon), Mon 22, Mon 29, Feb 1 (Thu)
    expect(runs("0 0 1,15 * 1", L(2024, 1, 1, 1), 5)).toEqual([
      "2024-01-08 00:00:00",
      "2024-01-15 00:00:00",
      "2024-01-22 00:00:00",
      "2024-01-29 00:00:00",
      "2024-02-01 00:00:00",
    ]);
  });

  it("uses AND semantics when day-of-month is '*'", () => {
    expect(runs("0 0 * * 5", L(2024, 1, 1), 2)).toEqual(["2024-01-05 00:00:00", "2024-01-12 00:00:00"]);
  });

  it("treats a '*'-prefixed step in day-of-month as unrestricted for OR semantics (Vixie)", () => {
    // */2 dom AND Friday: odd days that are Fridays. Jan 2024 Fridays: 5, 12, 19, 26 → odd: 5, 19
    expect(runs("0 0 */2 * 5", L(2024, 1, 1), 2)).toEqual(["2024-01-05 00:00:00", "2024-01-19 00:00:00"]);
  });

  it("supports '?' as an alias of '*' in day fields", () => {
    expect(runs("0 0 ? * MON", L(2024, 1, 1, 1), 1)).toEqual(["2024-01-08 00:00:00"]);
  });

  it("month restriction with names", () => {
    expect(runs("30 6 1 jan,jul *", L(2024, 2, 1), 3)).toEqual([
      "2024-07-01 06:30:00",
      "2025-01-01 06:30:00",
      "2025-07-01 06:30:00",
    ]);
  });

  it("yearly macro across year boundary", () => {
    expect(runs("@yearly", L(2024, 6, 15), 2)).toEqual(["2025-01-01 00:00:00", "2026-01-01 00:00:00"]);
  });

  it("6-field expressions with seconds", () => {
    expect(runs("*/20 * * * * *", L(2024, 1, 1, 0, 0, 5), 4)).toEqual([
      "2024-01-01 00:00:20",
      "2024-01-01 00:00:40",
      "2024-01-01 00:01:00",
      "2024-01-01 00:01:20",
    ]);
    expect(runs("30 0 12 * * *", L(2024, 1, 1, 12, 0, 30), 1)).toEqual(["2024-01-02 12:00:30"]);
  });

  it("lists of hours and minutes", () => {
    expect(runs("0,30 8,20 * * *", L(2024, 1, 1, 8, 15), 4)).toEqual([
      "2024-01-01 08:30:00",
      "2024-01-01 20:00:00",
      "2024-01-01 20:30:00",
      "2024-01-02 08:00:00",
    ]);
  });

  it("last minute of the year rolls over", () => {
    expect(runs("59 23 31 12 *", L(2024, 12, 31, 23, 59), 1)).toEqual(["2025-12-31 23:59:00"]);
  });

  it("returns exactly the requested count and strictly increasing", () => {
    const r = nextRuns(parseCron("*/7 * * * *"), L(2024, 1, 1), 10);
    expect(r).toHaveLength(10);
    for (let i = 1; i < r.length; i++) expect(r[i].getTime()).toBeGreaterThan(r[i - 1].getTime());
    // */7 resets each hour: 0,7,...,56 then 0
    expect(r.map(fmt).slice(7, 10)).toEqual(["2024-01-01 00:56:00", "2024-01-01 01:00:00", "2024-01-01 01:07:00"]);
  });

  it("every result matches the expression", () => {
    const c = parseCron("5-10/2 */3 1-10 */2 1,3,5");
    const r = nextRuns(c, L(2024, 1, 1), 50);
    expect(r).toHaveLength(50);
    for (const d of r) {
      expect([5, 7, 9]).toContain(d.getMinutes());
      expect(d.getHours() % 3).toBe(0);
      expect([1, 3, 5, 7, 9, 11]).toContain(d.getMonth() + 1);
      expect(d.getDate() <= 10 || [1, 3, 5].includes(d.getDay())).toBe(true);
    }
  });
});

describe("describeCron", () => {
  const t = (k: string) => k; // identity: assert on keys/structure
  const en: Record<string, string> = {
    "tool.cron.desc.atTime": "at {list}",
    "tool.cron.desc.every_minute": "every minute",
    "tool.cron.desc.everyN_minute": "every {n} minutes",
    "tool.cron.desc.at_minute": "at minute {list}",
    "tool.cron.desc.every_hour": "every hour",
    "tool.cron.desc.everyN_hour": "every {n} hours",
    "tool.cron.desc.at_hour": "during hour {list}",
    "tool.cron.desc.everyHour": "of every hour",
    "tool.cron.desc.onDow": "on {list}",
    "tool.cron.desc.onDom": "on day {list} of the month",
    "tool.cron.desc.inMonth": "in {list}",
    "tool.cron.desc.or": "or",
    "tool.cron.dow.1": "Monday",
    "tool.cron.dow.5": "Friday",
    "tool.cron.month.1": "January",
  };
  const te = (k: string) => en[k] ?? k;

  it("describes a simple daily time", () => {
    expect(describeCron(parseCron("30 9 * * *"), te)).toBe("At 09:30");
  });

  it("describes intervals with weekday ranges", () => {
    expect(describeCron(parseCron("*/15 9-17 * * 1-5"), te)).toBe(
      "Every 15 minutes, during hour 09–17, on Monday–Friday",
    );
  });

  it("describes OR day semantics", () => {
    expect(describeCron(parseCron("0 0 1 jan 1"), te)).toBe("At 00:00, on day 1 of the month or on Monday, in January");
  });

  it("describes every minute", () => {
    expect(describeCron(parseCron("* * * * *"), te)).toBe("Every minute");
  });

  it("describes a minute of every hour", () => {
    expect(describeCron(parseCron("5 * * * *"), te)).toBe("At minute 5, of every hour");
  });

  it("does not throw for any valid expression", () => {
    for (const e of ["@daily", "*/5 * * * * *", "0 0 L * *".replace("L", "1"), "1-5/2 */2 */3 */2 */2"]) {
      expect(typeof describeCron(parseCron(e), t)).toBe("string");
    }
  });
});
