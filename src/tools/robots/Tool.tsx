import { useMemo, useState } from "react";
import { Bot } from "lucide-react";
import { useI18n } from "@/i18n";

const SAMPLE = "User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: https://example.com/sitemap.xml";

export default function RobotsTool() {
  const { t } = useI18n();
  const [input, setInput] = useState(SAMPLE);
  const res = useMemo(() => {
    const lines = input.split(/\r?\n/);
    const sitemaps: string[] = [];
    const groups: string[] = [];
    const issues: string[] = [];
    lines.forEach((l, i) => {
      const line = l.trim();
      if (!line || line.startsWith("#")) return;
      const [k, ...rest] = line.split(":");
      const v = rest.join(":").trim();
      const key = k.toLowerCase();
      if (!v) issues.push(`${t("tool.robots.line")} ${i + 1}: ${t("tool.robots.missingValue")}`);
      if (key === "user-agent") groups.push(v);
      else if (key === "sitemap") sitemaps.push(v);
      else if (!["allow", "disallow", "crawl-delay", "host"].includes(key)) {
        issues.push(`${t("tool.robots.line")} ${i + 1}: ${t("tool.robots.unknownDirective")} ${k}`);
      }
    });
    return { groups, sitemaps, issues };
  }, [input, t]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b p-3 text-sm"><Bot className="size-4" /><b>Robots.txt Helper</b></div>
      <div className="grid flex-1 md:grid-cols-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="resize-none border-r bg-transparent p-3 font-mono text-sm" />
        <div className="space-y-3 overflow-auto p-4">
          <Box title={t("tool.robots.userAgents")} items={res.groups} />
          <Box title={t("tool.robots.sitemaps")} items={res.sitemaps} />
          <Box title={t("tool.robots.issues")} items={res.issues.length ? res.issues : [t("tool.robots.noIssues")]} />
        </div>
      </div>
    </div>
  );
}

function Box({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border p-3">
      <div className="mb-2 text-xs font-bold uppercase text-[var(--muted-foreground)]">{title}</div>
      {items.map((x, i) => <div key={i} className="font-mono text-xs">{x}</div>)}
    </div>
  );
}
