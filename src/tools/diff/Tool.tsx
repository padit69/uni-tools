import { useMemo, useState } from "react";
import { diffLines, diffWordsWithSpace, type Change } from "diff";
import { Eraser, GitCompare, Columns2, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Granularity = "lines" | "words";
type ViewMode = "unified" | "split";

export default function DiffTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("lines");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [hideUnchanged, setHideUnchanged] = useState(false);

  const parts = useMemo<Change[]>(() => {
    const a = ignoreCase ? left.toLowerCase() : left;
    const b = ignoreCase ? right.toLowerCase() : right;
    return granularity === "lines" ? diffLines(a, b) : diffWordsWithSpace(a, b);
  }, [left, right, granularity, ignoreCase]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const p of parts) {
      if (p.added) added += p.value.length;
      else if (p.removed) removed += p.value.length;
    }
    return { added, removed };
  }, [parts]);

  const linePairs = useMemo(() => toLinePairs(parts), [parts]);
  const inlineLines = useMemo(() => toInlineLines(parts), [parts]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <GitCompare className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Diff</span>
          {(stats.added > 0 || stats.removed > 0) && (
            <span className="text-xs">
              <span className="text-emerald-400">+{stats.added}</span>
              {" / "}
              <span className="text-red-400">-{stats.removed}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: "lines", label: "Dòng" },
              { value: "words", label: "Từ" },
            ]}
          />
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "split", label: <SplitLabel /> },
              { value: "unified", label: <UnifiedLabel /> },
            ]}
          />
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
              className="size-3 accent-[var(--primary)]"
            />
            Ignore case
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={hideUnchanged}
              onChange={(e) => setHideUnchanged(e.target.checked)}
              className="size-3 accent-[var(--primary)]"
            />
            Chỉ thay đổi
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLeft("");
              setRight("");
            }}
            disabled={!left && !right}
          >
            <Eraser className="size-3.5" /> Xóa
          </Button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid shrink-0 basis-[40%] grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
          <PaneHeader label="Bên trái" />
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            placeholder="Original..."
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <PaneHeader label="Bên phải" />
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            placeholder="Modified..."
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Diff result */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-[var(--border)]">
        <PaneHeader
          label={viewMode === "split" ? "So sánh — Side by side" : "So sánh — Unified"}
        />
        <div className="min-h-0 flex-1 overflow-auto">
          {!left && !right ? (
            <div className="flex h-full items-center justify-center p-6 text-xs text-[var(--muted-foreground)]">
              Nhập text vào hai pane bên trên để so sánh.
            </div>
          ) : viewMode === "split" ? (
            <SplitDiff pairs={linePairs} hideUnchanged={hideUnchanged} granularity={granularity} />
          ) : (
            <UnifiedDiff lines={inlineLines} hideUnchanged={hideUnchanged} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Diff renderers ---------- */

type LinePair =
  | { kind: "equal"; left: string; right: string }
  | { kind: "change"; left: string | null; right: string | null };

function SplitDiff({
  pairs,
  hideUnchanged,
  granularity,
}: {
  pairs: LinePair[];
  hideUnchanged: boolean;
  granularity: Granularity;
}) {
  let leftNo = 0;
  let rightNo = 0;
  const rows = pairs.map((p, i) => {
    const isEqual = p.kind === "equal";
    const lText = p.kind === "equal" ? p.left : p.left;
    const rText = p.kind === "equal" ? p.right : p.right;
    if (lText !== null) leftNo++;
    if (rText !== null) rightNo++;
    if (hideUnchanged && isEqual) return null;
    return (
      <div
        key={i}
        className="grid grid-cols-2 gap-0 border-b border-[var(--border)]/40 last:border-0"
      >
        <SplitCell
          n={lText !== null ? leftNo : null}
          text={lText}
          peer={rText}
          side="left"
          equal={isEqual}
          granularity={granularity}
        />
        <SplitCell
          n={rText !== null ? rightNo : null}
          text={rText}
          peer={lText}
          side="right"
          equal={isEqual}
          granularity={granularity}
        />
      </div>
    );
  });
  return <div className="font-mono text-xs leading-relaxed">{rows}</div>;
}

function SplitCell({
  n,
  text,
  peer,
  side,
  equal,
  granularity,
}: {
  n: number | null;
  text: string | null;
  peer: string | null;
  side: "left" | "right";
  equal: boolean;
  granularity: Granularity;
}) {
  const isMod = !equal && text !== null && peer !== null;
  const bg = equal
    ? ""
    : text === null
      ? "bg-[var(--muted)]/30"
      : side === "left"
        ? "bg-red-500/10"
        : "bg-emerald-500/10";
  const sign = equal ? " " : text === null ? " " : side === "left" ? "−" : "+";
  const signColor = equal
    ? "text-[var(--muted-foreground)]"
    : side === "left"
      ? "text-red-400"
      : "text-emerald-400";
  const borderL = side === "right" ? "border-l border-[var(--border)]/40" : "";

  return (
    <div className={cn("flex min-w-0", bg, borderL)}>
      <span className="w-10 shrink-0 select-none border-r border-[var(--border)]/40 px-2 py-0.5 text-right text-[10px] text-[var(--muted-foreground)]">
        {n ?? ""}
      </span>
      <span className={cn("w-4 shrink-0 select-none px-1 py-0.5 text-center", signColor)}>
        {sign}
      </span>
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words px-2 py-0.5">
        {text === null ? (
          <span className="text-[var(--muted-foreground)]/50">~</span>
        ) : isMod && granularity === "lines" ? (
          <WordHighlight a={side === "left" ? text : peer!} b={side === "left" ? peer! : text} side={side} />
        ) : (
          text
        )}
      </pre>
    </div>
  );
}

function WordHighlight({ a, b, side }: { a: string; b: string; side: "left" | "right" }) {
  const wordParts = useMemo(() => diffWordsWithSpace(a, b), [a, b]);
  return (
    <>
      {wordParts.map((p, i) => {
        if (side === "left" && p.added) return null;
        if (side === "right" && p.removed) return null;
        const cls = p.added
          ? "bg-emerald-500/30 text-emerald-200 rounded px-0.5"
          : p.removed
            ? "bg-red-500/30 text-red-200 rounded px-0.5"
            : "";
        return (
          <span key={i} className={cls}>
            {p.value}
          </span>
        );
      })}
    </>
  );
}

type InlineLine = {
  no: { left: number | null; right: number | null };
  kind: "equal" | "added" | "removed";
  text: string;
};

function UnifiedDiff({
  lines,
  hideUnchanged,
}: {
  lines: InlineLine[];
  hideUnchanged: boolean;
}) {
  return (
    <div className="font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        if (hideUnchanged && line.kind === "equal") return null;
        const bg =
          line.kind === "added"
            ? "bg-emerald-500/10"
            : line.kind === "removed"
              ? "bg-red-500/10"
              : "";
        const sign = line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " ";
        const signColor =
          line.kind === "added"
            ? "text-emerald-400"
            : line.kind === "removed"
              ? "text-red-400"
              : "text-[var(--muted-foreground)]";
        return (
          <div
            key={i}
            className={cn("flex min-w-0 border-b border-[var(--border)]/30 last:border-0", bg)}
          >
            <span className="w-10 shrink-0 select-none border-r border-[var(--border)]/40 px-2 py-0.5 text-right text-[10px] text-[var(--muted-foreground)]">
              {line.no.left ?? ""}
            </span>
            <span className="w-10 shrink-0 select-none border-r border-[var(--border)]/40 px-2 py-0.5 text-right text-[10px] text-[var(--muted-foreground)]">
              {line.no.right ?? ""}
            </span>
            <span className={cn("w-4 shrink-0 select-none px-1 py-0.5 text-center", signColor)}>
              {sign}
            </span>
            <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words px-2 py-0.5">
              {line.text}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- helpers ---------- */

function splitLines(value: string): string[] {
  if (value === "") return [];
  const lines = value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function toLinePairs(parts: Change[]): LinePair[] {
  const pairs: LinePair[] = [];
  let pendingRemoved: string[] = [];
  let pendingAdded: string[] = [];

  const flush = () => {
    const n = Math.max(pendingRemoved.length, pendingAdded.length);
    for (let i = 0; i < n; i++) {
      pairs.push({
        kind: "change",
        left: i < pendingRemoved.length ? pendingRemoved[i] : null,
        right: i < pendingAdded.length ? pendingAdded[i] : null,
      });
    }
    pendingRemoved = [];
    pendingAdded = [];
  };

  for (const p of parts) {
    const lines = splitLines(p.value);
    if (p.removed) {
      pendingRemoved.push(...lines);
    } else if (p.added) {
      pendingAdded.push(...lines);
    } else {
      flush();
      for (const line of lines) {
        pairs.push({ kind: "equal", left: line, right: line });
      }
    }
  }
  flush();
  return pairs;
}

function toInlineLines(parts: Change[]): InlineLine[] {
  const out: InlineLine[] = [];
  let leftNo = 0;
  let rightNo = 0;
  for (const p of parts) {
    const lines = splitLines(p.value);
    for (const line of lines) {
      if (p.added) {
        rightNo++;
        out.push({ kind: "added", text: line, no: { left: null, right: rightNo } });
      } else if (p.removed) {
        leftNo++;
        out.push({ kind: "removed", text: line, no: { left: leftNo, right: null } });
      } else {
        leftNo++;
        rightNo++;
        out.push({ kind: "equal", text: line, no: { left: leftNo, right: rightNo } });
      }
    }
  }
  return out;
}

/* ---------- UI bits ---------- */

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
            value === o.value
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

function SplitLabel() {
  return (
    <>
      <Columns2 className="size-3" />
      Split
    </>
  );
}

function UnifiedLabel() {
  return (
    <>
      <AlignLeft className="size-3" />
      Unified
    </>
  );
}
