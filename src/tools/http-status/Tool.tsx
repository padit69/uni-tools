import { useMemo, useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { HTTP_STATUSES, MIME_TYPES } from "./data";
import { searchMimes, searchStatuses, statusClass, type StatusClass } from "./search";

const CLASS_STYLE: Record<StatusClass, string> = {
  1: "text-sky-500 border-sky-500/30 bg-sky-500/10",
  2: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  3: "text-violet-500 border-violet-500/30 bg-violet-500/10",
  4: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  5: "text-red-500 border-red-500/30 bg-red-500/10",
};
const CLASSES: StatusClass[] = [1, 2, 3, 4, 5];

export default function HttpStatusTool() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState("status");
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState<StatusClass | null>(null);
  const [mimeQuery, setMimeQuery] = useState("");

  const statuses = useMemo(() => searchStatuses(HTTP_STATUSES, query, cls), [query, cls]);
  const mimes = useMemo(() => searchMimes(MIME_TYPES, mimeQuery), [mimeQuery]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <ListChecks className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.http-status.title")}</span>
      </div>
      <div className="flex flex-col overflow-auto p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="status">{t("tool.http-status.tabStatus")}</TabsTrigger>
            <TabsTrigger value="mime">{t("tool.http-status.tabMime")}</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("tool.http-status.searchPlaceholder")}
                className="h-10 pl-9"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant={cls === null ? "secondary" : "outline"} onClick={() => setCls(null)}>
                {t("tool.http-status.all")}
              </Button>
              {CLASSES.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cls === c ? "secondary" : "outline"}
                  onClick={() => setCls(cls === c ? null : c)}
                >
                  <span className="font-mono">{c}xx</span>
                  <span className="hidden font-normal text-[var(--muted-foreground)] sm:inline">
                    {t(`tool.http-status.class${c}`)}
                  </span>
                </Button>
              ))}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {t("tool.http-status.results").replace("{n}", String(statuses.length))}
            </div>
            {statuses.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                {t("tool.http-status.noResults")}
              </div>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {statuses.map((s) => (
                  <li
                    key={s.code}
                    className="group flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 font-mono text-sm font-semibold",
                        CLASS_STYLE[statusClass(s.code)],
                      )}
                    >
                      {s.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {s.name}
                        {s.unofficial && (
                          <span className="rounded border border-[var(--border)] px-1.5 text-[10px] font-normal uppercase tracking-wider text-[var(--muted-foreground)]">
                            {t("tool.http-status.unofficial")}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{lang === "vi" ? s.vi : s.en}</div>
                    </div>
                    <CopyButton
                      text={`${s.code} ${s.name}`}
                      iconOnly
                      className="shrink-0 opacity-60 group-hover:opacity-100"
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="mime" className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={mimeQuery}
                onChange={(e) => setMimeQuery(e.target.value)}
                placeholder={t("tool.http-status.mimePlaceholder")}
                className="h-10 pl-9"
              />
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {t("tool.http-status.results").replace("{n}", String(mimes.length))}
            </div>
            {mimes.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                {t("tool.http-status.noResults")}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-left text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("tool.http-status.colExt")}</th>
                      <th className="px-3 py-2 font-medium">{t("tool.http-status.colMime")}</th>
                      <th className="hidden px-3 py-2 font-medium sm:table-cell">{t("tool.http-status.colGroup")}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {mimes.map((m) => (
                      <tr key={m.ext} className="group border-t border-[var(--border)]">
                        <td className="px-3 py-1.5 font-mono whitespace-nowrap">{m.ext}</td>
                        <td className="px-3 py-1.5 font-mono break-all">{m.mime}</td>
                        <td className="hidden px-3 py-1.5 text-xs text-[var(--muted-foreground)] sm:table-cell">
                          {t(`tool.http-status.group.${m.group}`)}
                        </td>
                        <td className="px-1 py-1">
                          <CopyButton text={m.mime} iconOnly className="opacity-60 group-hover:opacity-100" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
