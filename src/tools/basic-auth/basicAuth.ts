function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** UTF-8 safe base64 encoding of `username:password` (RFC 7617, charset=UTF-8). */
export function encodeCredentials(username: string, password: string): string {
  return bytesToBase64(new TextEncoder().encode(`${username}:${password}`));
}

export function buildHeaderValue(username: string, password: string): string {
  return `Basic ${encodeCredentials(username, password)}`;
}

export function buildHeader(username: string, password: string): string {
  return `Authorization: ${buildHeaderValue(username, password)}`;
}

/** Single-quote a value for POSIX shells. */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function buildCurl(username: string, password: string, url = "https://example.com"): string {
  return `curl -u ${shellQuote(`${username}:${password}`)} ${shellQuote(url)}`;
}

export function buildFetch(username: string, password: string, url = "https://example.com"): string {
  return `fetch(${JSON.stringify(url)}, {\n  headers: {\n    Authorization: ${JSON.stringify(buildHeaderValue(username, password))},\n  },\n});`;
}

export type DecodeResult =
  | { ok: true; username: string; password: string }
  | { ok: false; error: "empty" | "invalidBase64" | "invalidUtf8" | "missingColon" };

/**
 * Accepts any of: "Authorization: Basic xxx", "Basic xxx", or a bare base64 token
 * (URL-safe alphabet and missing padding tolerated).
 */
export function decodeCredentials(input: string): DecodeResult {
  let s = input.trim();
  if (!s) return { ok: false, error: "empty" };
  s = s.replace(/^authorization\s*:\s*/i, "").replace(/^basic\s+/i, "").trim();
  s = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return { ok: false, error: "invalidBase64" };
  s = s.replace(/=+$/, "");
  if (s.length % 4 === 1) return { ok: false, error: "invalidBase64" };
  s += "=".repeat((4 - (s.length % 4)) % 4);
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(s);
  } catch {
    return { ok: false, error: "invalidBase64" };
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, error: "invalidUtf8" };
  }
  const idx = text.indexOf(":");
  if (idx < 0) return { ok: false, error: "missingColon" };
  return { ok: true, username: text.slice(0, idx), password: text.slice(idx + 1) };
}
