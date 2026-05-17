import { useMemo, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { useI18n } from "@/i18n";

const SAMPLE = navigator.userAgent;

function parse(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Unknown";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown";
  const device = /Mobile|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";
  const bot = /bot|crawl|spider|slurp|bingpreview/i.test(ua);
  return { browser, os, device, bot, engine: /WebKit/.test(ua) ? "WebKit" : /Gecko/.test(ua) ? "Gecko" : "Unknown" };
}

export default function UserAgentTool() {
  const { t } = useI18n();
  const [ua, setUa] = useState(SAMPLE);
  const r = useMemo(() => parse(ua), [ua]);
  const labels: Record<string, string> = {
    browser: t("tool.ua.browser"),
    os: t("tool.ua.os"),
    device: t("tool.ua.device"),
    bot: t("tool.ua.bot"),
    engine: t("tool.ua.engine"),
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b p-3 text-sm"><MonitorSmartphone className="size-4" /><b>User-Agent Parser</b></div>
      <div className="p-4">
        <textarea value={ua} onChange={(e) => setUa(e.target.value)} className="h-32 w-full rounded border bg-transparent p-2 font-mono text-xs" />
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {Object.entries(r).map(([k, v]) => (
            <div className="rounded border p-3" key={k}>
              <div className="text-[10px] uppercase text-[var(--muted-foreground)]">{labels[k] ?? k}</div>
              <div className="font-mono">{String(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
