import { useMemo, useState } from "react";
import { diffLines, diffWordsWithSpace } from "diff";
import { Eraser, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Granularity = "lines" | "words";

export default function DiffTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("lines");
  const [ignoreCase, setIgnoreCase] = useState(false);

  const parts = useMemo(() => {
    const a = ignoreCase ? left.toLowerCase() : left;
    const b = ignoreCase ? right.toLowerCase() : right;
    return granularity === "lines"
      ? diffLines(a, b)
      : diffWordsWithSpace(a, b);
  }, [left, right, granularity, ignoreCase]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const p of parts) {
      const c = p.value.length;
      if (p.added) added += c;
      else if (p.removed) removed += c;
    }
    return { added, removed };
  }, [parts]);

  return (
    <div className="flex h-full flex-col">
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
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
            {(["lines", "words"] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "rounded px-2 py-0.5",
                  granularity === g ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"
                )}
              >
                {g === "lines" ? "Dòng" : "Từ"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
              className="size-3 accent-[var(--primary)]"
            />
            Ignore case
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

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
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

      <div className="border-t border-[var(--border)]">
        <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Diff
          </span>
        </div>
        <div className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed">
          {!left && !right ? (
            <span className="text-[var(--muted-foreground)]">Nhập text vào hai pane bên trên để so sánh.</span>
          ) : (
            <pre className="whitespace-pre-wrap break-words">
              {parts.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    p.added && "bg-emerald-500/15 text-emerald-300",
                    p.removed && "bg-red-500/15 text-red-300 line-through"
                  )}
                >
                  {p.value}
                </span>
              ))}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}
