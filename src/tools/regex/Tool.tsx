import { useMemo, useState } from "react";
import { Eraser, Regex } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";

interface MatchResult {
  match: string;
  index: number;
  groups: (string | undefined)[];
  named?: Record<string, string>;
}

interface BuildResult {
  ok: true;
  re: RegExp;
  matches: MatchResult[];
}
interface BuildError {
  ok: false;
  error: string;
}

const FLAG_OPTS = [
  { key: "g", label: "g", desc: "global" },
  { key: "i", label: "i", desc: "ignore case" },
  { key: "m", label: "m", desc: "multiline" },
  { key: "s", label: "s", desc: "dot matches newline" },
  { key: "u", label: "u", desc: "unicode" },
  { key: "y", label: "y", desc: "sticky" },
] as const;

function build(pattern: string, flags: string, test: string): BuildResult | BuildError {
  if (!pattern) return { ok: true, re: new RegExp("(?:)", flags), matches: [] };
  try {
    const re = new RegExp(pattern, flags);
    const matches: MatchResult[] = [];
    if (re.global || re.sticky) {
      let m: RegExpExecArray | null;
      let safety = 0;
      while ((m = re.exec(test)) !== null && safety++ < 5000) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
          named: m.groups ? { ...m.groups } : undefined,
        });
        if (m[0] === "" && re.lastIndex === m.index) re.lastIndex++;
      }
    } else {
      const m = re.exec(test);
      if (m) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
          named: m.groups ? { ...m.groups } : undefined,
        });
      }
    }
    return { ok: true, re, matches };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export default function RegexTool() {
  const [pattern, setPattern] = useState("\\b\\w+@[\\w.-]+\\b");
  const [flags, setFlags] = useState<Set<string>>(new Set(["g"]));
  const [test, setTest] = useState("Contact alice@example.com or bob@test.io to learn more.");

  const result = useMemo(
    () => build(pattern, [...flags].join(""), test),
    [pattern, flags, test]
  );

  const highlightedTest = useMemo(() => {
    if (!result.ok || result.matches.length === 0) return null;
    const parts: Array<{ text: string; match: boolean }> = [];
    let cursor = 0;
    for (const m of result.matches) {
      if (m.index > cursor) parts.push({ text: test.slice(cursor, m.index), match: false });
      parts.push({ text: test.slice(m.index, m.index + m.match.length), match: true });
      cursor = m.index + m.match.length;
    }
    if (cursor < test.length) parts.push({ text: test.slice(cursor), match: false });
    return parts;
  }, [result, test]);

  const toggleFlag = (k: string) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Regex className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Regex Tester</span>
          {result.ok && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {result.matches.length} match{result.matches.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPattern("");
            setTest("");
          }}
          disabled={!pattern && !test}
        >
          <Eraser className="size-3.5" /> Clear
        </Button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="font-mono">/</span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="pattern"
              className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              spellCheck={false}
            />
            <span className="font-mono">/</span>
            <span className="font-mono">{[...flags].join("") || "—"}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {FLAG_OPTS.map((f) => (
              <button
                key={f.key}
                onClick={() => toggleFlag(f.key)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs",
                  flags.has(f.key)
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-white/5"
                )}
                title={f.desc}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!result.ok && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
            {result.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">Test string</span>
          <textarea
            value={test}
            onChange={(e) => setTest(e.target.value)}
            placeholder="Enter text to test regex..."
            className="min-h-32 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            spellCheck={false}
          />
        </div>

        {highlightedTest && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
            <div className="border-b border-[var(--border)] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Highlighted
            </div>
            <pre className="whitespace-pre-wrap break-words p-3 font-mono text-sm leading-relaxed">
              {highlightedTest.map((p, i) =>
                p.match ? (
                  <mark
                    key={i}
                    className="rounded bg-amber-500/30 px-0.5 text-amber-200"
                  >
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                )
              )}
            </pre>
          </div>
        )}

        {result.ok && result.matches.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">Matches</span>
            {result.matches.map((m, i) => (
              <div
                key={i}
                className="group flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2"
              >
                <span className="shrink-0 font-mono text-xs text-[var(--muted-foreground)]">
                  #{i + 1} @ {m.index}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="break-all font-mono text-sm">{m.match}</div>
                  {m.groups.length > 0 && m.groups.some(Boolean) && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      {m.groups.map((g, gi) =>
                        g !== undefined ? (
                          <span
                            key={gi}
                            className="rounded bg-white/5 px-1.5 py-0.5 font-mono"
                          >
                            ${gi + 1}: {g}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                  {m.named && Object.keys(m.named).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      {Object.entries(m.named).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 font-mono text-fuchsia-300"
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <CopyButton text={m.match} iconOnly className="opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
