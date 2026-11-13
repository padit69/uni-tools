import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextRuns, parseCron } from "../cron";

// Exercise DST transitions in a zone that has them. Node honours runtime TZ changes.
const prevTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  process.env.TZ = prevTz;
});

const iso = (d: Date) => d.toISOString();

describe("nextRuns across DST (America/New_York)", () => {
  it("skips the nonexistent 02:30 on spring-forward day", () => {
    // 2024-03-10 02:00 local → 03:00 local
    const r = nextRuns(parseCron("30 2 * * *"), new Date(2024, 2, 9, 12), 2);
    expect(r.map(iso)).toEqual(["2024-03-11T06:30:00.000Z", "2024-03-12T06:30:00.000Z"]);
  });

  it("hourly runs remain strictly increasing through spring-forward", () => {
    const r = nextRuns(parseCron("0 * * * *"), new Date(2024, 2, 10, 0, 30), 4);
    expect(r.map(iso)).toEqual([
      "2024-03-10T06:00:00.000Z", // 01:00 EST
      "2024-03-10T07:00:00.000Z", // 03:00 EDT
      "2024-03-10T08:00:00.000Z",
      "2024-03-10T09:00:00.000Z",
    ]);
  });

  it("does not loop or go backwards on fall-back day", () => {
    const r = nextRuns(parseCron("*/30 * * * *"), new Date(2024, 10, 3, 0, 0), 8);
    expect(r).toHaveLength(8);
    for (let i = 1; i < r.length; i++) expect(r[i].getTime()).toBeGreaterThan(r[i - 1].getTime());
  });

  it("daily job still runs once on fall-back day", () => {
    const r = nextRuns(parseCron("0 9 * * *"), new Date(2024, 10, 2, 12), 2);
    expect(r.map(iso)).toEqual(["2024-11-03T14:00:00.000Z", "2024-11-04T14:00:00.000Z"]);
  });
});
