import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eraser, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { JsonEditor } from "@/tools/json/JsonEditor";
import { cn } from "@/lib/cn";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

interface HeaderRow {
  id: number;
  key: string;
  value: string;
  enabled: boolean;
}

interface ResponseState {
  ok: boolean;
  status: number;
  statusText: string;
  timeMs: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

export default function CurlTool() {
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [method, setMethod] = useState<Method>("GET");
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: 1, key: "Accept", value: "application/json", enabled: true },
  ]);
  const [body, setBody] = useState(`{\n  "hello": "world"\n}`);
  const [curlText, setCurlText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [loading, setLoading] = useState(false);
  const editingCurlRef = useRef(false);

  const activeHeaders = useMemo(() => {
    return headers.filter((h) => h.enabled && h.key.trim()).reduce<Record<string, string>>((acc, h) => {
      acc[h.key.trim()] = h.value;
      return acc;
    }, {});
  }, [headers]);

  const canHaveBody = method !== "GET" && method !== "HEAD";
  const requestBody = canHaveBody && body.trim() ? body : undefined;
  const curl = useMemo(() => buildCurl({ url, method, headers: activeHeaders, body: requestBody }), [activeHeaders, method, requestBody, url]);

  useEffect(() => {
    if (editingCurlRef.current) {
      editingCurlRef.current = false;
      return;
    }
    setCurlText(curl);
  }, [curl]);

  const send = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    const started = performance.now();
    try {
      const nextHeaders = { ...activeHeaders };
      if (requestBody && !hasHeader(nextHeaders, "content-type")) {
        nextHeaders["Content-Type"] = "application/json";
      }
      const res = await fetch(url, {
        method,
        headers: nextHeaders,
        body: requestBody,
      });
      const text = await res.text();
      setResponse({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        timeMs: Math.round(performance.now() - started),
        headers: Object.fromEntries(res.headers.entries()),
        body: text,
      });
    } catch (e) {
      setResponse({
        ok: false,
        status: 0,
        statusText: "Request failed",
        timeMs: Math.round(performance.now() - started),
        headers: {},
        body: "",
        error: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHeader = (id: number, patch: Partial<HeaderRow>) => {
    setHeaders((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addHeader = () => {
    setHeaders((current) => [...current, { id: Date.now(), key: "", value: "", enabled: true }]);
  };

  const clear = () => {
    setUrl("");
    setBody("");
    setCurlText("");
    setParseError(null);
    setResponse(null);
  };

  const applyCurlText = (value: string) => {
    try {
      const parsed = parseCurl(value);
      editingCurlRef.current = true;
      setUrl(parsed.url);
      setMethod(parsed.method);
      setHeaders(parsed.headers);
      setBody(parsed.body ?? "");
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const handleCurlTextChange = (value: string) => {
    setCurlText(value);
    if (!value.trim()) {
      setParseError(null);
      return;
    }
    applyCurlText(value);
  };

  const syncCurlFromForm = () => {
    editingCurlRef.current = false;
    setCurlText(curl);
    setParseError(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="text-sm font-medium">Curl Tester</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={clear} disabled={!url && !body && !response} title="Xóa">
            <Eraser className="size-3.5" />
          </Button>
          <Button variant="secondary" size="icon" className="size-8" onClick={() => navigator.clipboard.writeText(curlText || curl)} disabled={!url && !curlText} title="Copy curl">
            <Copy className="size-3.5" />
          </Button>
          <Button size="sm" onClick={send} disabled={!url || loading}>
            <Play className="size-3.5" />
            {loading ? "Sending" : "Send"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(360px,520px)_1fr]">
        <div className="flex min-h-0 flex-col overflow-y-auto border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => {
                const next = e.target.value as Method;
                setMethod(next);
              }}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 text-xs font-semibold"
            >
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/users"
              className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              spellCheck={false}
            />
          </div>

          <SectionTitle label="Headers" action={<Button variant="secondary" size="icon" className="size-7" onClick={addHeader} title="Add header"><Plus className="size-3.5" /></Button>} />
          <div className="space-y-2">
            {headers.map((row) => (
              <div key={row.id} className="grid grid-cols-[22px_1fr_1fr_28px] items-center gap-2">
                <input type="checkbox" checked={row.enabled} onChange={(e) => updateHeader(row.id, { enabled: e.target.checked })} className="size-3 accent-[var(--primary)]" />
                <input value={row.key} onChange={(e) => updateHeader(row.id, { key: e.target.value })} placeholder="Header" className="h-8 min-w-0 rounded-md border border-[var(--border)] bg-[var(--muted)]/20 px-2 font-mono text-xs" />
                <input value={row.value} onChange={(e) => updateHeader(row.id, { value: e.target.value })} placeholder="Value" className="h-8 min-w-0 rounded-md border border-[var(--border)] bg-[var(--muted)]/20 px-2 font-mono text-xs" />
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setHeaders((current) => current.filter((h) => h.id !== row.id))} title="Remove header">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <SectionTitle label="Body" />
          <div className="mb-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/20 px-2 py-1 text-xs text-[var(--muted-foreground)]">
            JSON body {canHaveBody ? "" : "không dùng cho GET/HEAD"}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!canHaveBody}
            placeholder={`{\n  "name": "Ada"\n}`}
            className="min-h-36 resize-y rounded-md border border-[var(--border)] bg-transparent p-3 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
            spellCheck={false}
          />
          {canHaveBody && body.trim() && !looksJson(body) && (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-400">
              Body hiện chưa phải JSON hợp lệ.
            </div>
          )}

          <SectionTitle
            label="Curl"
            action={
              <Button variant="secondary" size="sm" onClick={syncCurlFromForm}>
                Sync from form
              </Button>
            }
          />
          <textarea
            value={curlText}
            onChange={(e) => handleCurlTextChange(e.target.value)}
            placeholder={`curl 'https://api.example.com/users' \\\n  -H 'Authorization: Bearer ...' \\\n  --data-raw '{"name":"Ada"}'`}
            className="min-h-32 resize-y rounded-md border border-[var(--border)] bg-[var(--muted)]/10 p-3 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            spellCheck={false}
          />
          {parseError && (
            <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-400">
              {parseError}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Response</div>
            {response && (
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("rounded px-1.5 py-0.5 font-mono", response.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
                  {response.status || "ERR"} {response.statusText}
                </span>
                <span className="font-mono text-[var(--muted-foreground)]">{response.timeMs}ms</span>
              </div>
            )}
          </div>

          {!response ? (
            <Empty message="Send request để xem response." />
          ) : response.error ? (
            <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
              {response.error}
              <div className="mt-2 text-[var(--muted-foreground)]">
                Browser fetch bị giới hạn bởi CORS. Nếu endpoint không cho phép CORS, hãy copy curl và chạy trong terminal.
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-rows-[1fr_180px] overflow-hidden">
              <div className="min-h-0 overflow-auto">
                <JsonEditor value={prettyBody(response.body)} readOnly lang={looksJson(response.body) ? "json" : "text"} height="100%" style={{ height: "100%" }} />
              </div>
              <div className="min-h-0 overflow-auto border-t border-[var(--border)] p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Headers</div>
                <div className="space-y-1 font-mono text-xs">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[160px_1fr] gap-3">
                      <span className="text-[var(--muted-foreground)]">{key}</span>
                      <span className="break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-4 flex items-center justify-between">
      <div className="text-xs font-medium">{label}</div>
      {action}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-xs text-[var(--muted-foreground)]">{message}</div>;
}

function hasHeader(headers: Record<string, string>, name: string) {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildCurl({ url, method, headers, body }: { url: string; method: Method; headers: Record<string, string>; body?: string }) {
  const parts = ["curl", "-i", "-X", method, shellQuote(url || "https://api.example.com")];
  for (const [key, value] of Object.entries(headers)) {
    parts.push("-H", shellQuote(`${key}: ${value}`));
  }
  if (body !== undefined) parts.push("--data-raw", shellQuote(body));
  return parts.join(" \\\n  ");
}

function tokenizeCurl(input: string) {
  const normalized = input.replace(/\\\r?\n/g, " ");
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
  let escaped = false;

  for (const char of normalized) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      if (quote === "'") {
        current += char;
      } else {
        escaped = true;
      }
      continue;
    }

    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (quote) throw new Error("Curl command thiếu dấu quote đóng.");
  if (escaped) current += "\\";
  if (current) tokens.push(current);
  return tokens;
}

function parseCurl(input: string): { url: string; method: Method; headers: HeaderRow[]; body?: string } {
  const tokens = tokenizeCurl(input.trim());
  if (tokens[0] !== "curl") throw new Error("Command phải bắt đầu bằng curl.");

  let url = "";
  let method: Method | null = null;
  let body: string | undefined;
  const parsedHeaders: HeaderRow[] = [];

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (token === "-X" || token === "--request") {
      i++;
      method = normalizeMethod(next);
    } else if (token.startsWith("-X") && token.length > 2) {
      method = normalizeMethod(token.slice(2));
    } else if (token === "-H" || token === "--header") {
      i++;
      const header = parseHeader(next);
      parsedHeaders.push({ id: Date.now() + i, key: header.key, value: header.value, enabled: true });
    } else if (token.startsWith("-H") && token.length > 2) {
      const header = parseHeader(token.slice(2));
      parsedHeaders.push({ id: Date.now() + i, key: header.key, value: header.value, enabled: true });
    } else if (["-d", "--data", "--data-raw", "--data-binary", "--data-ascii"].includes(token)) {
      i++;
      body = body ? `${body}&${next}` : next;
      if (!method) method = "POST";
    } else if (token.startsWith("--data-raw=")) {
      body = token.slice("--data-raw=".length);
      if (!method) method = "POST";
    } else if (token === "--url") {
      i++;
      url = next ?? "";
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      url = token;
    } else if (!token.startsWith("-") && !url) {
      url = token;
    } else if (token === "-i" || token === "--include" || token === "-s" || token === "--silent" || token === "-L" || token === "--location") {
      continue;
    }
  }

  if (!url) throw new Error("Không tìm thấy URL trong curl command.");
  return {
    url,
    method: method ?? "GET",
    headers: parsedHeaders.length > 0 ? parsedHeaders : [{ id: 1, key: "Accept", value: "application/json", enabled: true }],
    body,
  };
}

function normalizeMethod(value: string | undefined): Method {
  const upper = value?.toUpperCase();
  if (upper && METHODS.includes(upper as Method)) return upper as Method;
  throw new Error(`HTTP method không hỗ trợ: ${value ?? ""}`);
}

function parseHeader(value: string | undefined) {
  if (!value) throw new Error("Header thiếu giá trị.");
  const index = value.indexOf(":");
  if (index === -1) throw new Error(`Header không hợp lệ: ${value}`);
  return {
    key: value.slice(0, index).trim(),
    value: value.slice(index + 1).trim(),
  };
}

function looksJson(value: string) {
  const trimmed = value.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

function prettyBody(value: string) {
  if (!looksJson(value)) return value;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
