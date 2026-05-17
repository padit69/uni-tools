import { useMemo, useState } from "react";
import { ArrowRightLeft, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";

type Mode = "encode" | "decode";
type Strategy = "component" | "uri";

function transform(input: string, mode: Mode, strategy: Strategy): string {
  if (!input) return "";
  if (mode === "encode") {
    return strategy === "component" ? encodeURIComponent(input) : encodeURI(input);
  }
  return strategy === "component" ? decodeURIComponent(input) : decodeURI(input);
}

export default function UrlTool() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("encode");
  const [strategy, setStrategy] = useState<Strategy>("component");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input) return { ok: true, output: "" } as const;
    try {
      return { ok: true, output: transform(input, mode, strategy) } as const;
    } catch (e) {
      return { ok: false, error: (e as Error).message } as const;
    }
  }, [input, mode, strategy]);

  const swap = () => {
    if (result.ok && result.output) {
      setInput(result.output);
      setMode(mode === "encode" ? "decode" : "encode");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-2.5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="encode">{t("action.encode")}</TabsTrigger>
            <TabsTrigger value="decode">{t("action.decode")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
            {(["component", "uri"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={cn(
                  "rounded px-2 py-0.5 transition-colors",
                  strategy === s
                    ? "bg-[var(--card)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
                title={
                  s === "component"
                    ? t("tool.url.componentTitle")
                    : t("tool.url.uriTitle")
                }
              >
                {s === "component" ? "Component" : "URI"}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={swap} disabled={!result.ok || !result.output}>
            <ArrowRightLeft className="size-3.5" /> {t("action.swap")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            <Eraser className="size-3.5" /> {t("action.clear")}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
          <PaneHeader label={mode === "encode" ? t("label.plain") : t("label.encoded")} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? t("tool.url.placeholder.encode") : t("tool.url.placeholder.decode")}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <PaneHeader
            label={result.ok ? (mode === "encode" ? t("label.encoded") : t("label.plain")) : t("label.error")}
            right={result.ok ? <CopyButton text={result.output} /> : null}
          />
          {result.ok ? (
            <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-sm">
              {result.output || <span className="text-[var(--muted-foreground)]">—</span>}
            </div>
          ) : (
            <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
              {result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
