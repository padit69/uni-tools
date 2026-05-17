import { useMemo, useState } from "react";
import { ArrowRightLeft, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

function encode(s: string): string {
  // UTF-8 safe Base64
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

function decode(s: string, invalidMessage: string): string {
  try {
    const binary = atob(s.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    throw new Error(invalidMessage);
  }
}

export default function Base64Tool() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input) return { ok: true, output: "" } as const;
    try {
      return { ok: true, output: mode === "encode" ? encode(input) : decode(input, t("error.invalidBase64")) } as const;
    } catch (e) {
      return { ok: false, error: (e as Error).message } as const;
    }
  }, [input, mode, t]);

  const swap = () => {
    if (result.ok && result.output) {
      setInput(result.output);
      setMode(mode === "encode" ? "decode" : "encode");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "encode" | "decode")}>
          <TabsList>
            <TabsTrigger value="encode">{t("action.encode")}</TabsTrigger>
            <TabsTrigger value="decode">{t("action.decode")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
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
          <PaneHeader label={mode === "encode" ? t("label.plainText") : "Base64"} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? t("tool.base64.placeholder.encode") : t("tool.base64.placeholder.decode")}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <PaneHeader
            label={result.ok ? (mode === "encode" ? "Base64" : t("label.plainText")) : t("label.error")}
            right={result.ok ? <CopyButton text={result.output} /> : null}
          />
          <OutputBody result={result} />
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

function OutputBody({ result }: { result: { ok: true; output: string } | { ok: false; error: string } }) {
  if (!result.ok) {
    return (
      <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
        {result.error}
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-sm">
      {result.output || <span className="text-[var(--muted-foreground)]">—</span>}
    </div>
  );
}
