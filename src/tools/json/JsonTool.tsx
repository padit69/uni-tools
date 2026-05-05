import { useMemo, useState } from "react";
import { Check, Copy, Eraser, FileCode, FileWarning, Minimize2, Wand2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { JsonEditor } from "./JsonEditor";
import { TreeView } from "./TreeView";
import { formatJson, minifyJson, type Indent } from "./format";
import { validateJson } from "./validate";
import { convert, type Format } from "./convert";
import { useToolHistory } from "@/hooks/useToolHistory";
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

  const history = useToolHistory("json");

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

  /* ---------- Actions ---------- */

  const handleFormat = () => {
    try {
      const out = formatJson(input, indent);
      setOutput(out);
      history.push(input);
      toast.success("Đã format");
    } catch (e) {
      toast.error("JSON không hợp lệ", { description: (e as Error).message });
    }
  };

  const handleMinify = () => {
    try {
      const out = minifyJson(input);
      setOutput(out);
      history.push(input);
      toast.success("Đã minify");
    } catch (e) {
      toast.error("JSON không hợp lệ", { description: (e as Error).message });
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
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

        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          {/* Input pane */}
          <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
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
          <div className="flex flex-col overflow-hidden">
            <TabsContent value="format" className="m-0 flex h-full flex-col">
              <PaneHeader
                label="Output"
                right={<CopyButton text={output} />}
              />
              <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-2">
                <Button onClick={handleFormat} disabled={!input} className="flex-1">
                  <Wand2 className="size-3.5" />
                  Format
                </Button>
                <Button onClick={handleMinify} disabled={!input} variant="secondary" className="flex-1">
                  <Minimize2 className="size-3.5" />
                  Minify
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <JsonEditor value={output} readOnly lang="json" height="100%" style={{ height: "100%" }} />
              </div>
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
