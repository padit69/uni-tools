import { useMemo, useState } from "react";
import { ArrowUpToLine, Eraser, Type } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { applyLineOp, computeStats, type LineOp } from "./ops";
import { useFileDrop } from "@/lib/fileDrop";

const OPS: { op: LineOp; key: string }[] = [
  { op: "sortAsc", key: "sortAsc" },
  { op: "sortDesc", key: "sortDesc" },
  { op: "sortNatural", key: "sortNatural" },
  { op: "sortLength", key: "sortLength" },
  { op: "reverse", key: "reverse" },
  { op: "dedupe", key: "dedupe" },
  { op: "removeEmpty", key: "removeEmpty" },
  { op: "trim", key: "trim" },
  { op: "shuffle", key: "shuffle" },
  { op: "number", key: "number" },
];

export default function TextToolsTool() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  useFileDrop("text-tools", (f) => setInput(f.text));
  const [output, setOutput] = useState("");
  const [lastOp, setLastOp] = useState<LineOp | null>(null);
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [joinSep, setJoinSep] = useState(", ");
  const [splitSep, setSplitSep] = useState(",");

  const stats = useMemo(() => computeStats(input), [input]);

  const run = (op: LineOp, separator?: string) => {
    setOutput(applyLineOp(input, op, { caseInsensitive, separator }));
    setLastOp(op);
  };

  const statItems: { label: string; value: string }[] = [
    { label: t("tool.text-tools.characters"), value: stats.characters.toLocaleString() },
    { label: t("tool.text-tools.charactersNoSpaces"), value: stats.charactersNoSpaces.toLocaleString() },
    { label: t("tool.text-tools.words"), value: stats.words.toLocaleString() },
    { label: t("tool.text-tools.lines"), value: stats.lines.toLocaleString() },
    { label: t("tool.text-tools.sentences"), value: stats.sentences.toLocaleString() },
    { label: t("tool.text-tools.paragraphs"), value: stats.paragraphs.toLocaleString() },
    { label: t("tool.text-tools.bytes"), value: stats.bytes.toLocaleString() },
    { label: t("tool.text-tools.readingTime"), value: `${stats.readingTimeMinutes} ${t("tool.text-tools.minutes")}` },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <Type className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.text-tools.title")}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statItems.map((s) => (
            <div key={s.label} className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{s.label}</div>
              <div className="mt-1 font-mono text-sm tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {OPS.map(({ op, key }) => (
              <Button
                key={op}
                size="sm"
                variant={lastOp === op ? "secondary" : "outline"}
                onClick={() => run(op)}
                disabled={!input}
              >
                {t(`tool.text-tools.op.${key}`)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={caseInsensitive}
                onChange={(e) => setCaseInsensitive(e.target.checked)}
                className="size-3 accent-[var(--primary)]"
              />
              {t("tool.text-tools.caseInsensitive")}
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                value={joinSep}
                onChange={(e) => setJoinSep(e.target.value)}
                className="h-8 w-24 font-mono text-xs"
                aria-label={t("tool.text-tools.separator")}
                placeholder={t("tool.text-tools.separator")}
              />
              <Button size="sm" variant={lastOp === "join" ? "secondary" : "outline"} onClick={() => run("join", joinSep)} disabled={!input}>
                {t("tool.text-tools.op.join")}
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={splitSep}
                onChange={(e) => setSplitSep(e.target.value)}
                className="h-8 w-24 font-mono text-xs"
                aria-label={t("tool.text-tools.separator")}
                placeholder={t("tool.text-tools.separator")}
              />
              <Button size="sm" variant={lastOp === "split" ? "secondary" : "outline"} onClick={() => run("split", splitSep)} disabled={!input}>
                {t("tool.text-tools.op.split")}
              </Button>
            </div>
            <span className="text-[11px] text-[var(--muted-foreground)]">{t("tool.text-tools.separatorHint")}</span>
          </div>
        </div>

        <div className="grid min-h-[420px] flex-1 gap-3 md:grid-cols-2">
          <Pane
            label={t("tool.text-tools.input")}
            actions={
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setInput(""); setOutput(""); setLastOp(null); }} disabled={!input && !output}>
                <Eraser className="size-3.5" />
                {t("tool.text-tools.clear")}
              </Button>
            }
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("tool.text-tools.placeholder")}
              spellCheck={false}
              className="h-full min-h-[200px] w-full resize-none bg-transparent p-3 font-mono text-sm outline-none"
            />
          </Pane>
          <Pane
            label={t("tool.text-tools.output")}
            actions={
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setInput(output); setLastOp(null); }}
                  disabled={!output}
                >
                  <ArrowUpToLine className="size-3.5" />
                  {t("tool.text-tools.useAsInput")}
                </Button>
                <CopyButton text={output} label={t("tool.text-tools.copy")} />
              </>
            }
          >
            <textarea
              value={output}
              readOnly
              placeholder={t("tool.text-tools.outputPlaceholder")}
              spellCheck={false}
              className="h-full min-h-[200px] w-full resize-none bg-transparent p-3 font-mono text-sm outline-none"
            />
          </Pane>
        </div>
      </div>
    </div>
  );
}

function Pane({ label, actions, children, className }: { label: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/20", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
