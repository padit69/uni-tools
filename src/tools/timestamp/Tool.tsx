import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

function parseInput(s: string): Date | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  // pure number → unix timestamp; auto-detect seconds vs milliseconds
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    // > 10^12 likely ms; otherwise seconds
    const d = trimmed.length > 10 ? new Date(n) : new Date(n * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export default function TimestampTool() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [now, setNow] = useState(() => new Date());

  // refresh "now" + relative every 30s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo(() => (input ? parseInput(input) : now), [input, now]);

  const fields = useMemo(() => {
    if (!parsed) return null;
    return [
      { label: "Unix (s)", value: String(Math.floor(parsed.getTime() / 1000)) },
      { label: "Unix (ms)", value: String(parsed.getTime()) },
      { label: "ISO 8601", value: parsed.toISOString() },
      { label: "RFC 2822", value: parsed.toUTCString() },
      { label: t("label.local"), value: format(parsed, "yyyy-MM-dd HH:mm:ss zzz") },
      {
        label: t("label.relative"),
        value: formatDistanceToNow(parsed, { addSuffix: true }),
      },
      { label: t("label.year"), value: String(parsed.getFullYear()) },
      { label: t("label.dayOfYear"), value: String(dayOfYear(parsed)) },
      { label: t("label.week"), value: String(weekOfYear(parsed)) },
    ];
  }, [parsed, t]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Timestamp</span>
          <span className="text-xs text-[var(--muted-foreground)]">{t("tool.timestamp.subtitle")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
            {t("tool.timestamp.now")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            <Eraser className="size-3.5" /> {t("action.clear")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("tool.timestamp.placeholder")}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          spellCheck={false}
        />

        {!parsed && input.trim() && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
            {t("tool.timestamp.parseError")} "{input}". {t("tool.timestamp.parseHint")}
          </div>
        )}

        {fields && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.label}
                className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                    {f.label}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-sm">{f.value}</div>
                </div>
                <CopyButton text={f.value} iconOnly className="opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}
function weekOfYear(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
