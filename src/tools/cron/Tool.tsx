import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { FIELD_SPECS, describeCron, fieldValuesLabel, nextRuns, tryParseCron, type CronError } from "./cron";

const PRESETS: { key: string; expr: string }[] = [
  { key: "everyMinute", expr: "* * * * *" },
  { key: "every5Minutes", expr: "*/5 * * * *" },
  { key: "every15Minutes", expr: "*/15 * * * *" },
  { key: "hourly", expr: "0 * * * *" },
  { key: "daily", expr: "0 0 * * *" },
  { key: "daily9", expr: "0 9 * * *" },
  { key: "weekdays9", expr: "0 9 * * 1-5" },
  { key: "weekly", expr: "0 0 * * 0" },
  { key: "monthly", expr: "0 0 1 * *" },
  { key: "yearly", expr: "0 0 1 1 *" },
  { key: "every10Seconds", expr: "*/10 * * * * *" },
];

const COUNTS = [5, 10] as const;

function errorMessage(err: CronError, t: (k: string) => string): string {
  const field = err.field ? t(`tool.cron.field.${err.field}`) : "";
  const spec = err.field ? FIELD_SPECS[err.field] : undefined;
  return t(`tool.cron.error.${err.code}`)
    .replace("{field}", field)
    .replace("{value}", err.value ?? "")
    .replace("{min}", String(spec?.min ?? ""))
    .replace("{max}", String(spec?.key === "dow" ? 7 : (spec?.max ?? "")));
}

export default function CronTool() {
  const { t, lang } = useI18n();
  const [expr, setExpr] = useState("*/15 9-17 * * 1-5");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [now] = useState(() => new Date());

  const parsed = useMemo(() => tryParseCron(expr), [expr]);
  const description = useMemo(() => (parsed.ok ? describeCron(parsed.cron, t) : ""), [parsed, t]);
  const runs = useMemo(() => (parsed.ok ? nextRuns(parsed.cron, now, count) : []), [parsed, now, count]);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [lang],
  );

  const shownFields = parsed.ok
    ? parsed.cron.fields.filter((f) => parsed.cron.hasSeconds || f.key !== "second")
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <CalendarClock className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.cron.title")}</span>
      </div>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">{t("tool.cron.expression")}</span>
          <div className="flex items-center gap-2">
            <Input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              spellCheck={false}
              placeholder="*/5 * * * *"
              className={cn("h-10 font-mono", !parsed.ok && expr.trim() && "border-red-500/50")}
            />
            <CopyButton text={expr.trim()} iconOnly />
          </div>
          <span className="text-[11px] text-[var(--muted-foreground)]">{t("tool.cron.hint")}</span>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">{t("tool.cron.presets")}</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={expr.trim() === p.expr ? "secondary" : "outline"}
                onClick={() => setExpr(p.expr)}
                title={p.expr}
              >
                {t(`tool.cron.preset.${p.key}`)}
              </Button>
            ))}
          </div>
        </div>

        {!parsed.ok ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
            {errorMessage(parsed.error, t)}
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                {t("tool.cron.meaning")}
              </div>
              <div className="mt-1 text-base font-medium">{description}</div>
              {parsed.cron.macro && (
                <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                  {parsed.cron.macro} = {parsed.cron.expanded}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="flex min-w-0 flex-col gap-2">
                <h3 className="text-xs font-medium">{t("tool.cron.breakdown")}</h3>
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--muted)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t("tool.cron.colField")}</th>
                        <th className="px-3 py-2 font-medium">{t("tool.cron.colValue")}</th>
                        <th className="px-3 py-2 font-medium">{t("tool.cron.colAllowed")}</th>
                        <th className="px-3 py-2 font-medium">{t("tool.cron.colMatches")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownFields.map((f) => {
                        const spec = FIELD_SPECS[f.key];
                        const allowed =
                          f.key === "month"
                            ? "1-12, JAN-DEC"
                            : f.key === "dow"
                              ? "0-7, SUN-SAT"
                              : `${spec.min}-${spec.max}`;
                        return (
                          <tr key={f.key} className="border-t border-[var(--border)] align-top">
                            <td className="px-3 py-2 whitespace-nowrap">{t(`tool.cron.field.${f.key}`)}</td>
                            <td className="px-3 py-2 font-mono">{f.raw}</td>
                            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-[var(--muted-foreground)]">
                              {allowed}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs break-all">
                              {f.star && f.tokens.length === 1 && f.tokens[0].kind === "all"
                                ? t("tool.cron.any")
                                : fieldValuesLabel(f)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!parsed.cron.get("dom").star && !parsed.cron.get("dow").star && (
                  <p className="text-xs text-[var(--muted-foreground)]">{t("tool.cron.orNote")}</p>
                )}
              </section>

              <section className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-medium">
                    {t("tool.cron.nextRuns")}{" "}
                    <span className="font-normal text-[var(--muted-foreground)]">({tz})</span>
                  </h3>
                  <div className="flex gap-1">
                    {COUNTS.map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        variant={count === c ? "secondary" : "ghost"}
                        className="h-7 px-2"
                        onClick={() => setCount(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                {runs.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-500">
                    {t("tool.cron.noRuns")}
                  </div>
                ) : (
                  <ol className="flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                    {runs.map((d, i) => (
                      <li key={d.getTime()} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="w-5 text-right text-xs text-[var(--muted-foreground)]">{i + 1}</span>
                        <span className="font-mono">{dateFmt.format(d)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
