import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Eraser,
  FileCode,
  FileWarning,
  Info,
  Minimize2,
  RefreshCw,
  Search,
  SortAsc,
  Wand2,
  ArrowRightLeft,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { JsonEditor } from "./JsonEditor";
import { TreeView } from "./TreeView";
import { formatJson, minifyJson, sortJson, type Indent } from "./format";
import { validateJson } from "./validate";
import { convert, type Format } from "./convert";
import { repairJson } from "./repair";
import { analyzeJson, queryJson } from "./query";
import { useToolHistory } from "@/hooks/useToolHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/cn";

const SAMPLE = `{
  "name": "uni-tool",
  "version": "0.1.0",
  "tools": [
    { "id": "json", "category": "json" },
    { "id": "base64", "category": "encode" }
  ],
  "active": true,
  "owner": null
}`;

type Tab = "format" | "validate" | "tree" | "convert";

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tab, setTab] = useState<Tab>("format");
  const [indent, setIndent] = useState<Indent>(2);
  const [from, setFrom] = useState<Format>("json");
  const [to, setTo] = useState<Format>("yaml");
  const [queryPath, setQueryPath] = useState("$.tools[*].id");
  const [updateInputOnAction, setUpdateInputOnAction] = useState(false);
  const [autoFormat, setAutoFormat] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [inputWidth, setInputWidth] = useLocalStorage("json-pane-input-width", 50);
  const splitRef = useRef<HTMLDivElement>(null);

  const history = useToolHistory("json");

  const showOutputPane = true;

  const validation = useMemo(() => validateJson(input), [input]);

  const treeData = useMemo(() => {
    if (tab !== "tree" || !input.trim()) return null;
    try {
      return { ok: true as const, data: JSON.parse(input) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [tab, input]);

  const convertResult = useMemo(() => {
    if (tab !== "convert" || !input.trim()) return null;
    try {
      return { ok: true as const, output: convert(input, from, to) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [tab, input, from, to]);

  const queryResult = useMemo(() => {
    if (tab !== "format" || !showQuery || !input.trim() || !queryPath.trim()) return null;
    try {
      return { ok: true as const, output: queryJson(input, queryPath) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [tab, showQuery, input, queryPath]);

  const stats = useMemo(() => {
    if (tab !== "format" || !input.trim()) return null;
    try {
      return { ok: true as const, data: analyzeJson(input) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [tab, input]);

  useEffect(() => {
    if (!autoFormat || tab !== "format" || !input.trim()) return;
    const timer = window.setTimeout(() => {
      try {
        const out = formatJson(input, indent);
        setOutput(out);
        if (updateInputOnAction && out !== input) setInput(out);
      } catch {
        // Ignore partial JSON while the user is still typing.
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [autoFormat, tab, input, indent, updateInputOnAction]);

  /* ---------- Actions ---------- */

  const applyActionOutput = (value: string) => {
    setOutput(value);
    if (updateInputOnAction) setInput(value);
  };

  const handleFormat = () => {
    try {
      const out = formatJson(input, indent);
      history.push(input);
      applyActionOutput(out);
      toast.success("Đã format");
    } catch (e) {
      toast.error("JSON không hợp lệ", { description: (e as Error).message });
    }
  };

  const handleMinify = () => {
    try {
      const out = minifyJson(input);
      history.push(input);
      applyActionOutput(out);
      toast.success("Đã minify");
    } catch (e) {
      toast.error("JSON không hợp lệ", { description: (e as Error).message });
    }
  };

  const handleSort = () => {
    try {
      const out = sortJson(input, indent);
      history.push(input);
      applyActionOutput(out);
      toast.success("Đã sort key");
    } catch (e) {
      toast.error("JSON không hợp lệ", { description: (e as Error).message });
    }
  };

  const handleRepair = () => {
    try {
      const out = repairJson(input, indent);
      history.push(input);
      applyActionOutput(out);
      toast.success("Đã repair JSON");
    } catch (e) {
      toast.error("Không repair được", { description: (e as Error).message });
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = splitRef.current;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const next = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setInputWidth(Math.min(75, Math.max(25, Math.round(next))));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleSwap = () => {
    if (convertResult?.ok) {
      setInput(convertResult.output);
      setFrom(to);
      setTo(from);
    } else {
      setFrom(to);
      setTo(from);
    }
  };

  /* ---------- Render ---------- */

  return (
    <div className="flex h-full flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
          <TabsList>
            <TabsTrigger value="format">
              <Wand2 className="size-3.5" />
              Format
            </TabsTrigger>
            <TabsTrigger value="validate">
              <FileWarning className="size-3.5" />
              Validate
            </TabsTrigger>
            <TabsTrigger value="tree">
              <FileCode className="size-3.5" />
              Tree
            </TabsTrigger>
            <TabsTrigger value="convert">
              <ArrowRightLeft className="size-3.5" />
              Convert
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {tab === "format" && <IndentSelector value={indent} onChange={setIndent} />}
            {tab === "convert" && (
              <ConvertSelector from={from} to={to} setFrom={setFrom} setTo={setTo} onSwap={handleSwap} />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput(SAMPLE)}
              disabled={!!input}
              title="Chèn ví dụ"
            >
              Ví dụ
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={!input && !output}>
              <Eraser className="size-3.5" />
              Xóa
            </Button>
          </div>
        </div>

        <div
          ref={splitRef}
          className={cn(
            "grid flex-1 overflow-hidden grid-cols-1",
            showOutputPane && "md:grid-cols-[var(--json-input-width)_6px_minmax(0,1fr)]"
          )}
          style={{ "--json-input-width": `${inputWidth}%` } as React.CSSProperties}
        >
          {/* Input pane */}
          <div
            className={cn(
              "flex flex-col overflow-hidden",
              showOutputPane && "border-b border-[var(--border)] md:border-b-0"
            )}
          >
            <PaneHeader
              label="Input"
              right={
                <ValidationBadge ok={validation.ok} count={validation.errors.length} hasInput={!!input} />
              }
            />
            <div className="min-h-0 flex-1 overflow-auto">
              <JsonEditor
                value={input}
                onChange={setInput}
                lang={tab === "convert" ? formatToLang(from) : "json"}
                withLinter={tab === "validate" || tab === "format"}
                placeholder="Paste JSON vào đây..."
                height="100%"
                style={{ height: "100%" }}
              />
            </div>
          </div>

          {/* Output pane */}
          {showOutputPane && (
          <>
          <div
            className="hidden cursor-col-resize bg-[var(--border)] transition-colors hover:bg-[var(--primary)] md:block"
            onPointerDown={startResize}
            title="Kéo để đổi độ rộng input/output"
          />
          <div className="flex flex-col overflow-hidden">
            <TabsContent value="format" className="m-0 flex h-full flex-col">
              <PaneHeader
                label="Format"
                right={
                  <FormatHeaderActions
                    input={input}
                    showQuery={showQuery}
                    setShowQuery={setShowQuery}
                    showStats={showStats}
                    setShowStats={setShowStats}
                    autoFormat={autoFormat}
                    setAutoFormat={setAutoFormat}
                    updateInputOnAction={updateInputOnAction}
                    setUpdateInputOnAction={setUpdateInputOnAction}
                    onRepair={handleRepair}
                    onSort={handleSort}
                    onFormat={handleFormat}
                    onMinify={handleMinify}
                  />
                }
              />
              <ToolsPane
                input={input}
                output={output}
                queryPath={queryPath}
                setQueryPath={setQueryPath}
                queryResult={queryResult}
                stats={stats}
                showQuery={showQuery}
                showStats={showStats}
              />
            </TabsContent>

            <TabsContent value="validate" className="m-0 flex h-full flex-col">
              <PaneHeader label={validation.ok && input ? "Hợp lệ" : "Errors"} />
              <ValidatePane input={input} result={validation} />
            </TabsContent>

            <TabsContent value="tree" className="m-0 flex h-full flex-col">
              <PaneHeader label="Tree" />
              <TreePane data={treeData} hasInput={!!input.trim()} />
            </TabsContent>

            <TabsContent value="convert" className="m-0 flex h-full flex-col">
              <PaneHeader
                label={`${from.toUpperCase()} → ${to.toUpperCase()}`}
                right={convertResult?.ok ? <CopyButton text={convertResult.output} /> : null}
              />
              <ConvertPane result={convertResult} toLang={formatToLang(to)} />
            </TabsContent>
          </div>
          </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

/* ---------- Sub components ---------- */

function PaneHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </span>
      {right}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="h-7 text-xs"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Đã copy" : "Copy"}
    </Button>
  );
}

function ValidationBadge({ ok, count, hasInput }: { ok: boolean; count: number; hasInput: boolean }) {
  if (!hasInput) return null;
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
        <Check className="size-3" /> Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
      {count} lỗi
    </span>
  );
}

function IndentSelector({ value, onChange }: { value: Indent; onChange: (i: Indent) => void }) {
  const opts: Array<{ v: Indent; label: string }> = [
    { v: 2, label: "2" },
    { v: 4, label: "4" },
    { v: "tab", label: "Tab" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
      <span className="px-1.5 text-[var(--muted-foreground)]">Indent</span>
      {opts.map((o) => (
        <button
          key={String(o.v)}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded px-2 py-0.5 transition-colors",
            value === o.v
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ConvertSelector({
  from,
  to,
  setFrom,
  setTo,
  onSwap,
}: {
  from: Format;
  to: Format;
  setFrom: (f: Format) => void;
  setTo: (f: Format) => void;
  onSwap: () => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <FormatSelect value={from} onChange={setFrom} />
      <Button variant="ghost" size="icon" className="size-7" onClick={onSwap} title="Swap">
        <ArrowRightLeft className="size-3.5" />
      </Button>
      <FormatSelect value={to} onChange={setTo} />
    </div>
  );
}

function FormatSelect({ value, onChange }: { value: Format; onChange: (f: Format) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Format)}
      className="h-7 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-xs uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <option value="json">JSON</option>
      <option value="yaml">YAML</option>
      <option value="csv">CSV</option>
      <option value="xml">XML</option>
    </select>
  );
}

function ValidatePane({
  input,
  result,
}: {
  input: string;
  result: ReturnType<typeof validateJson>;
}) {
  if (!input.trim()) {
    return <EmptyState message="Paste JSON vào pane bên trái để kiểm tra." />;
  }
  if (result.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check className="size-6" />
        </div>
        <p className="text-sm font-medium">JSON hợp lệ</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Không phát hiện lỗi cú pháp.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-auto p-3">
      {result.errors.map((err, i) => (
        <div
          key={i}
          className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs"
        >
          <div className="flex items-center gap-2 text-red-400">
            <FileWarning className="size-3.5" />
            <span className="font-mono font-medium">
              line {err.line}, col {err.col}
            </span>
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px]">
              {err.code}
            </span>
          </div>
          <p className="mt-1 text-[var(--foreground)]">{err.message}</p>
        </div>
      ))}
    </div>
  );
}

function TreePane({
  data,
  hasInput,
}: {
  data: { ok: true; data: unknown } | { ok: false; error: string } | null;
  hasInput: boolean;
}) {
  if (!hasInput) {
    return <EmptyState message="Paste JSON để xem dạng cây." />;
  }
  if (!data) return <EmptyState message="Đang xử lý..." />;
  if (!data.ok) {
    return (
      <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs">
        <div className="font-medium text-red-400">JSON không hợp lệ</div>
        <p className="mt-1 text-[var(--foreground)]">{data.error}</p>
      </div>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <TreeView data={data.data as any} />;
}

function ConvertPane({
  result,
  toLang,
}: {
  result: { ok: true; output: string } | { ok: false; error: string } | null;
  toLang: "json" | "yaml" | "xml" | "text";
}) {
  if (!result) return <EmptyState message="Paste input và chọn From/To để convert." />;
  if (!result.ok) {
    return (
      <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs">
        <div className="font-medium text-red-400">Convert thất bại</div>
        <p className="mt-1 text-[var(--foreground)]">{result.error}</p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <JsonEditor value={result.output} readOnly lang={toLang} height="100%" style={{ height: "100%" }} />
    </div>
  );
}

function FormatHeaderActions({
  input,
  showQuery,
  setShowQuery,
  showStats,
  setShowStats,
  autoFormat,
  setAutoFormat,
  updateInputOnAction,
  setUpdateInputOnAction,
  onRepair,
  onSort,
  onFormat,
  onMinify,
}: {
  input: string;
  showQuery: boolean;
  setShowQuery: (value: boolean) => void;
  showStats: boolean;
  setShowStats: (value: boolean) => void;
  autoFormat: boolean;
  setAutoFormat: (value: boolean) => void;
  updateInputOnAction: boolean;
  setUpdateInputOnAction: (value: boolean) => void;
  onRepair: () => void;
  onSort: () => void;
  onFormat: () => void;
  onMinify: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <label
        className="mr-1 flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--muted)]/25 px-2 text-xs text-[var(--muted-foreground)]"
        title="Ghi kết quả action vào input"
      >
        <input
          type="checkbox"
          checked={updateInputOnAction}
          onChange={(e) => setUpdateInputOnAction(e.target.checked)}
          className="size-3 accent-[var(--primary)]"
        />
        <span className="hidden sm:inline">Update input</span>
      </label>
      <Button
        onClick={() => setAutoFormat(!autoFormat)}
        variant={autoFormat ? "default" : "secondary"}
        size="icon"
        className="size-7"
        title={autoFormat ? "Tắt auto format" : "Bật auto format"}
      >
        <RefreshCw className="size-3.5" />
      </Button>
      <Button onClick={onFormat} disabled={!input} size="icon" className="size-7" title="Format">
        <Wand2 className="size-3.5" />
      </Button>
      <Button onClick={onMinify} disabled={!input} variant="secondary" size="icon" className="size-7" title="Minify">
        <Minimize2 className="size-3.5" />
      </Button>
      <Button onClick={onRepair} disabled={!input} variant="secondary" size="icon" className="size-7" title="Repair JSON">
        <Wrench className="size-3.5" />
      </Button>
      <Button onClick={onSort} disabled={!input} variant="secondary" size="icon" className="size-7" title="Sort keys">
        <SortAsc className="size-3.5" />
      </Button>
      <Button
        onClick={() => setShowStats(!showStats)}
        variant={showStats ? "default" : "secondary"}
        size="icon"
        className="size-7"
        title={showStats ? "Ẩn thống kê" : "Hiện thống kê"}
      >
        <Info className="size-3.5" />
      </Button>
      <Button
        onClick={() => setShowQuery(!showQuery)}
        variant={showQuery ? "default" : "secondary"}
        size="icon"
        className="size-7"
        title={showQuery ? "Ẩn query" : "Mở query"}
      >
        <Search className="size-3.5" />
      </Button>
    </div>
  );
}

function ToolsPane({
  input,
  output,
  queryPath,
  setQueryPath,
  queryResult,
  stats,
  showQuery,
  showStats,
}: {
  input: string;
  output: string;
  queryPath: string;
  setQueryPath: (path: string) => void;
  queryResult: { ok: true; output: string } | { ok: false; error: string } | null;
  stats:
    | { ok: true; data: ReturnType<typeof analyzeJson> }
    | { ok: false; error: string }
    | null;
  showQuery: boolean;
  showStats: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {showQuery && (
      <div className="shrink-0 border-b border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={queryPath}
              onChange={(e) => setQueryPath(e.target.value)}
              placeholder="$.users[*].email"
              className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--muted)]/25 pl-7 pr-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
      )}

      {showStats && stats?.ok && (
        <div className="grid shrink-0 grid-cols-4 gap-px border-b border-[var(--border)] bg-[var(--border)] text-xs">
          <Stat label="Keys" value={stats.data.keys} />
          <Stat label="Objects" value={stats.data.objects} />
          <Stat label="Arrays" value={stats.data.arrays} />
          <Stat label="Depth" value={stats.data.maxDepth} />
        </div>
      )}
      {showStats && stats?.ok === false && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          JSON không hợp lệ: {stats.error}
        </div>
      )}

      <div className={cn("grid min-h-0 flex-1 overflow-hidden", showQuery ? "grid-rows-2" : "grid-rows-1")}>
        {showQuery && (
        <div className="flex min-h-0 flex-col overflow-hidden">
          <PaneHeader label="Query result" right={queryResult?.ok ? <CopyButton text={queryResult.output} /> : null} />
          {!input.trim() ? (
            <EmptyState message="Paste JSON để repair, sort hoặc query." />
          ) : !queryPath.trim() ? (
            <EmptyState message="Nhập JSON path, ví dụ $.tools[*].id." />
          ) : queryResult?.ok ? (
            <JsonEditor value={queryResult.output} readOnly lang="json" height="100%" style={{ height: "100%" }} />
          ) : (
            <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs">
              <div className="font-medium text-red-400">Query thất bại</div>
              <p className="mt-1 text-[var(--foreground)]">
                {queryResult?.ok === false ? queryResult.error : stats?.ok === false ? stats.error : "Không có kết quả."}
              </p>
            </div>
          )}
        </div>
        )}
        <div className="flex min-h-0 flex-col overflow-hidden border-t border-[var(--border)]">
          <PaneHeader label="Action output" right={output ? <CopyButton text={output} /> : null} />
          {output ? (
            <JsonEditor value={output} readOnly lang="json" height="100%" style={{ height: "100%" }} />
          ) : (
            <EmptyState message="Repair, sort, format hoặc minify để tạo output." />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--card)] px-3 py-2">
      <div className="font-mono text-sm font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-[var(--muted-foreground)]">
      {message}
    </div>
  );
}

function formatToLang(f: Format): "json" | "yaml" | "xml" | "text" {
  if (f === "json") return "json";
  if (f === "yaml") return "yaml";
  if (f === "xml") return "xml";
  return "text";
}
