import { describe, expect, it } from "vitest";
import { HTTP_STATUSES, MIME_TYPES } from "../data";
import { normalize, searchMimes, searchStatuses, statusClass } from "../search";

const codes = (q: string, cls?: 1 | 2 | 3 | 4 | 5) => searchStatuses(HTTP_STATUSES, q, cls).map((s) => s.code);

describe("data integrity", () => {
  it("has unique codes and complete en/vi text", () => {
    const set = new Set(HTTP_STATUSES.map((s) => s.code));
    expect(set.size).toBe(HTTP_STATUSES.length);
    for (const s of HTTP_STATUSES) {
      expect(s.code).toBeGreaterThanOrEqual(100);
      expect(s.code).toBeLessThan(600);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
      expect(s.vi.length).toBeGreaterThan(0);
    }
  });

  it("covers all standard IANA codes", () => {
    const standard = [
      100, 101, 102, 103, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 307, 308,
      400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423,
      424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ];
    const have = new Set(HTTP_STATUSES.map((s) => s.code));
    for (const c of standard) expect(have.has(c)).toBe(true);
  });

  it("is sorted by code", () => {
    const c = HTTP_STATUSES.map((s) => s.code);
    expect([...c].sort((a, b) => a - b)).toEqual(c);
  });

  it("has unique extensions with valid-looking MIME types", () => {
    const exts = MIME_TYPES.map((m) => m.ext);
    expect(new Set(exts).size).toBe(exts.length);
    for (const m of MIME_TYPES) {
      expect(m.ext).toMatch(/^\.[a-z0-9]+$/);
      expect(m.mime).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/);
    }
  });
});

describe("searchStatuses", () => {
  it("returns everything for an empty query", () => {
    expect(codes("")).toHaveLength(HTTP_STATUSES.length);
  });

  it("matches exact code", () => {
    expect(codes("404")).toEqual([404]);
  });

  it("matches code prefix", () => {
    expect(codes("50")).toEqual([500, 501, 502, 503, 504, 505, 506, 507, 508]);
  });

  it("matches class shorthand", () => {
    expect(codes("3xx")).toEqual([300, 301, 302, 303, 304, 305, 307, 308]);
  });

  it("matches by name, case-insensitive", () => {
    expect(codes("not found")[0]).toBe(404);
    expect(codes("TEAPOT")).toEqual([418]);
  });

  it("matches by description text in English and Vietnamese (diacritics-insensitive)", () => {
    expect(codes("rate limiting")).toContain(429);
    expect(codes("giới hạn tần suất")).toContain(429);
    expect(codes("gioi han tan suat")).toContain(429);
  });

  it("ranks name matches first", () => {
    const r = codes("timeout");
    expect(r.slice(0, 2)).toEqual([408, 504]);
  });

  it("filters by class", () => {
    expect(codes("", 1)).toEqual([100, 101, 102, 103]);
    expect(codes("redirect", 3)).toEqual([307, 308]);
  });

  it("statusClass", () => {
    expect(statusClass(204)).toBe(2);
    expect(statusClass(599)).toBe(5);
  });
});

describe("normalize", () => {
  it("strips Vietnamese diacritics", () => {
    expect(normalize("Đã xoá vĩnh viễn")).toBe("da xoa vinh vien");
  });
});

describe("searchMimes", () => {
  it("finds by extension with or without dot, exact first", () => {
    expect(searchMimes(MIME_TYPES, "json")[0].ext).toBe(".json");
    expect(searchMimes(MIME_TYPES, ".png").map((m) => m.mime)[0]).toBe("image/png");
  });

  it("finds by MIME type", () => {
    const r = searchMimes(MIME_TYPES, "image/jpeg").map((m) => m.ext);
    expect(r).toEqual([".jpg", ".jpeg"]);
  });

  it("finds by group", () => {
    expect(searchMimes(MIME_TYPES, "font").every((m) => m.group === "font" || m.mime.includes("font"))).toBe(true);
  });
});
