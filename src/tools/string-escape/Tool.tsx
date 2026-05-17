import { useMemo, useState } from "react";
import { ArrowRightLeft, Eraser, Quote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { escape, unescape, LANG_LABEL, type Lang } from "./escape";
import { useI18n } from "@/i18n";

type Mode = "encode" | "decode";

const SAMPLE = `Hello "world"\nTab:\tEnd. Em dash: — Non-ASCII: café`;

export default function StringEscapeTool() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("encode");
  const [lang, setLang] = useState<Lang>("js");

  const result = useMemo(() => {
    if (!input) return { ok: true as const, output: "" };
    try {
      return {
        ok: true as const,
        output: mode === "encode" ? escape(input, lang) : unescape(input, lang),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [input, mode, lang]);

  const handleSwap = () => {
    if (result.ok && result.output) {
      setInput(result.output);
    }
    setMode(mode === "encode" ? "decode" : "encode");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Quote className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">String Escape</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeSelector mode={mode} onChange={setMode} />
          <Button variant="ghost" size="sm" onClick={handleSwap} title={t("tool.string.swapDirection")} className="h-7 px-2 text-xs">
            <ArrowRightLeft className="size-3.5" />
            {t("action.swap")}
          </Button>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <option key={l} value={l}>
                {LANG_LABEL[l]}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)} disabled={!!input}>
            {t("json.example")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            <Eraser className="size-3.5" /> {t("action.clear")}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
          <PaneHeader label={mode === "encode" ? t("tool.string.raw") : t("tool.string.escaped")} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? t("tool.string.enterText") : t("tool.string.pasteEscaped")}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <PaneHeader
            label={mode === "encode" ? t("tool.string.escaped") : t("tool.string.raw")}
            right={result.ok ? <CopyButton text={result.output} /> : null}
          />
          <div className="min-h-0 flex-1 overflow-auto">
            {!input ? (
              <EmptyHint mode={mode} lang={lang} />
            ) : result.ok ? (
              <pre className="whitespace-pre-wrap break-words p-3 font-mono text-sm">{result.output}</pre>
            ) : (
              <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs">
                <div className="font-medium text-red-400">{t("label.error")}</div>
                <p className="mt-1">{result.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
      {(["encode", "decode"] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "rounded px-2 py-0.5 transition-colors",
            mode === m
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {m === "encode" ? t("tool.string.escape") : t("tool.string.unescape")}
        </button>
      ))}
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

function EmptyHint({ mode, lang }: { mode: Mode; lang: Lang }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-[var(--muted-foreground)]">
      {mode === "encode"
        ? `${t("tool.string.emptyEncode")} ${LANG_LABEL[lang]}.`
        : `${t("tool.string.emptyDecode")} ${LANG_LABEL[lang]} ${t("tool.string.emptyDecodeSuffix")}`}
    </div>
  );
}
