/**
 * Global file drag & drop: decide which tool should open a dropped file, and hand the
 * file's content to that tool once it mounts (or immediately, if it is already open).
 */
import { useEffect, useRef } from "react";

export const MAX_DROP_BYTES = 10 * 1024 * 1024;

export type ConvertFrom = "yaml" | "csv" | "xml";
export type CodeLang = "html" | "css" | "js";

export interface DroppedFile {
  /** Tool id (and slug) that should open the file. */
  toolId: string;
  text: string;
  fileName: string;
  /** For the JSON tool: open the Convert tab with this source format. */
  convertFrom?: ConvertFrom;
  /** For the beautifier: which language to select. */
  lang?: CodeLang;
}

const MINI_DRAW_SCENE_TYPE = "uni-tools/mini-draw";

function ext(name: string): string {
  const base = name.toLowerCase().split(/[\\/]/).pop() ?? "";
  if (base === ".env" || base.startsWith(".env.") || base.endsWith(".env")) return "env";
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1) : "";
}

/** True for content that looks binary (NUL bytes / many control chars in the first 8 KB). */
export function looksBinary(text: string): boolean {
  const sample = text.slice(0, 8192);
  if (sample.includes("\u0000")) return true;
  let ctrl = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12) ctrl++;
  }
  return sample.length > 0 && ctrl / sample.length > 0.1;
}

const BINARY_MIME = /^(image|audio|video|font)\/|^application\/(pdf|zip|gzip|x-tar|x-7z|octet-stream|vnd\.)/;

function isApiSpec(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if ("openapi" in o || "swagger" in o) return true;
  const info = o.info as Record<string, unknown> | undefined;
  return typeof info?.schema === "string" && info.schema.includes("getpostman");
}

const YAML_SPEC_RE = /^\s*(openapi|swagger)\s*:/m;

/**
 * Pick the tool for a file. Returns null when no tool can open it (binary / unknown).
 * `text` is the decoded file content.
 */
export function routeFile(name: string, mime: string, text: string): Omit<DroppedFile, "text" | "fileName"> | null {
  const e = ext(name);
  if (BINARY_MIME.test(mime) && !/svg/.test(mime)) return null;
  if (looksBinary(text)) return null;

  const tryJson = () => {
    try {
      return { ok: true as const, value: JSON.parse(text) as unknown };
    } catch {
      return { ok: false as const };
    }
  };

  if (e === "yaml" || e === "yml" || /yaml/.test(mime)) {
    return YAML_SPEC_RE.test(text) ? { toolId: "postman-docs" } : { toolId: "json", convertFrom: "yaml" };
  }

  if (e === "json" || /json/.test(mime) || e === "") {
    const parsed = tryJson();
    if (parsed.ok) {
      const v = parsed.value as Record<string, unknown> | null;
      if (v && typeof v === "object" && !Array.isArray(v) && v.type === MINI_DRAW_SCENE_TYPE) return { toolId: "mini-draw" };
      if (isApiSpec(v)) return { toolId: "postman-docs" };
      return { toolId: "json" };
    }
    if (e === "json" || /json/.test(mime)) return { toolId: "json" }; // invalid JSON: let the JSON tool show errors
  }

  switch (e) {
    case "csv":
    case "tsv":
      return { toolId: "json", convertFrom: "csv" };
    case "xml":
      return { toolId: "json", convertFrom: "xml" };
    case "md":
    case "markdown":
    case "mdx":
      return { toolId: "markdown" };
    case "sql":
      return { toolId: "sql" };
    case "html":
    case "htm":
    case "vue":
    case "svelte":
      return { toolId: "beautifier", lang: "html" };
    case "css":
    case "scss":
    case "less":
      return { toolId: "beautifier", lang: "css" };
    case "js":
    case "mjs":
    case "cjs":
    case "jsx":
    case "ts":
    case "tsx":
      return { toolId: "beautifier", lang: "js" };
    case "env":
      return { toolId: "config" };
    case "jwt":
      return { toolId: "jwt" };
  }

  if (/^\s*[\w-]+\.[\w-]+\.[\w-]*\s*$/.test(text) && text.trim().startsWith("eyJ")) return { toolId: "jwt" };
  return { toolId: "text-tools" };
}

/* ------------------------------------------------------------------ hand-off */

let pending: DroppedFile | null = null;
const listeners = new Set<(f: DroppedFile) => boolean>();

/**
 * Deliver a file. If a mounted tool with that id is listening it receives it right away;
 * otherwise it is kept until that tool mounts and calls `useFileDrop`.
 */
export function deliverFile(file: DroppedFile) {
  for (const l of listeners) if (l(file)) return;
  pending = file;
}

/** Subscribe a tool to dropped files routed to `toolId`. The handler always sees the latest closure. */
export function useFileDrop(toolId: string, handler: (file: DroppedFile) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (pending && pending.toolId === toolId) {
      const f = pending;
      pending = null;
      ref.current(f);
    }
    const listener = (f: DroppedFile) => {
      if (f.toolId !== toolId) return false;
      ref.current(f);
      return true;
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [toolId]);
}

/** Test helper. */
export function _resetFileDrop() {
  pending = null;
  listeners.clear();
}

/* ------------------------------------------------------- hand-off across tabs */

const CHANNEL = "uni-tools:file-drop";
export const DROP_PARAM = "drop";
const outbox = new Map<string, DroppedFile>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(CHANNEL);
  channel.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data as { type?: string; id?: string };
    if (msg?.type === "request" && msg.id && outbox.has(msg.id)) {
      channel!.postMessage({ type: "payload", id: msg.id, file: outbox.get(msg.id) });
      outbox.delete(msg.id);
    }
  });
  return channel;
}

/**
 * Open `path` in a new browser tab and hand it `file`. Must be called from a click
 * (user activation), otherwise the browser blocks the popup. Returns false if blocked.
 */
export function openFileInNewTab(path: string, file: DroppedFile): boolean {
  const ch = getChannel();
  if (!ch) return false;
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  outbox.set(id, file);
  setTimeout(() => outbox.delete(id), 5 * 60_000);
  const win = window.open(`${path}?${DROP_PARAM}=${encodeURIComponent(id)}`, "_blank");
  if (!win) {
    outbox.delete(id);
    return false;
  }
  return true;
}

/** In a tab opened by `openFileInNewTab`: fetch the file from the opener and deliver it. */
export function receiveFileFromOpener(id: string, timeoutMs = 4000): Promise<DroppedFile | null> {
  const ch = getChannel();
  if (!ch) return Promise.resolve(null);
  return new Promise((resolve) => {
    const onMsg = (e: MessageEvent) => {
      const msg = e.data as { type?: string; id?: string; file?: DroppedFile };
      if (msg?.type === "payload" && msg.id === id && msg.file) {
        cleanup();
        deliverFile(msg.file);
        resolve(msg.file);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      ch.removeEventListener("message", onMsg);
    };
    ch.addEventListener("message", onMsg);
    ch.postMessage({ type: "request", id });
  });
}
