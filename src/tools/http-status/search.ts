import type { HttpStatus, MimeType } from "./data";

export type StatusClass = 1 | 2 | 3 | 4 | 5;

export const statusClass = (code: number): StatusClass => Math.floor(code / 100) as StatusClass;

/** Lowercase + strip Vietnamese diacritics so "khong tim thay" matches "Không tìm thấy". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/**
 * Filter statuses by code, class ("4xx"), name or description text (both languages).
 * Exact code match → only that code. A numeric prefix ("40") → codes starting with it.
 */
export function searchStatuses(list: HttpStatus[], query: string, cls?: StatusClass | null): HttpStatus[] {
  const q = query.trim();
  let items = cls ? list.filter((s) => statusClass(s.code) === cls) : list;
  if (!q) return items;

  const classMatch = /^([1-5])xx$/i.exec(q);
  if (classMatch) return items.filter((s) => statusClass(s.code) === Number(classMatch[1]));

  if (/^\d{1,3}$/.test(q)) return items.filter((s) => String(s.code).startsWith(q));

  const terms = normalize(q).split(/\s+/).filter(Boolean);
  items = items.filter((s) => {
    const hay = normalize(`${s.code} ${s.name} ${s.en} ${s.vi}`);
    return terms.every((term) => hay.includes(term));
  });
  // Rank: name matches first
  const nq = normalize(q);
  return [...items].sort((a, b) => {
    const an = normalize(a.name).includes(nq) ? 0 : 1;
    const bn = normalize(b.name).includes(nq) ? 0 : 1;
    return an - bn || a.code - b.code;
  });
}

/** Filter MIME types by extension (with or without leading dot) or by MIME type text. */
export function searchMimes(list: MimeType[], query: string): MimeType[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const extQ = q.startsWith(".") ? q : `.${q}`;
  const exact = list.filter((m) => m.ext === extQ);
  const rest = list.filter((m) => m.ext !== extQ && (m.ext.includes(q) || m.mime.includes(q) || m.group.includes(q)));
  return [...exact, ...rest];
}
