import { useMemo, useState } from "react";
import { Coins, Eraser, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import {
  CONTEXT_PRESETS,
  PRICE_PRESETS,
  countChars,
  countWords,
  estimateChatTokens,
  estimateCost,
  estimateDetailed,
  parseChatMessages,
} from "./estimate";

const fmt = (n: number) => n.toLocaleString("en-US");
const fmtUsd = (n: number) =>
  "$" + (n === 0 ? "0" : n < 0.01 ? n.toFixed(6) : n.toFixed(4));
const fmtCtx = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}k`);

export default function TokenCounterTool() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [presetId, setPresetId] = useState(PRICE_PRESETS[0].id);
  const [inPrice, setInPrice] = useState(String(PRICE_PRESETS[0].input));
  const [outPrice, setOutPrice] = useState(String(PRICE_PRESETS[0].output));
  const [outTokens, setOutTokens] = useState("500");
  const [ctx, setCtx] = useState("128000");

  const chat = useMemo(() => parseChatMessages(text), [text]);
  const detail = useMemo(() => estimateDetailed(text), [text]);
  const inputTokens = useMemo(
    () => (chat ? estimateChatTokens(chat) : detail.tokens),
    [chat, detail]
  );
  const chars = useMemo(() => countChars(text), [text]);
  const words = useMemo(() => countWords(text), [text]);

  const outN = Math.max(0, Number(outTokens) || 0);
  const ctxN = Math.max(0, Number(ctx) || 0);
  const cost = estimateCost(inputTokens, outN, Number(inPrice), Number(outPrice));
  const totalTokens = inputTokens + outN;
  const share = ctxN > 0 ? (totalTokens / ctxN) * 100 : 0;

  const applyPreset = (id: string) => {
    setPresetId(id);
    const p = PRICE_PRESETS.find((x) => x.id === id);
    if (p) {
      setInPrice(String(p.input));
      setOutPrice(String(p.output));
    }
  };

  const breakdownRows: [string, number][] = [
    [t("tool.token-counter.bdWords"), detail.breakdown.asciiWords],
    [t("tool.token-counter.bdDiacritic"), detail.breakdown.diacriticWords],
    [t("tool.token-counter.bdOther"), detail.breakdown.otherWords],
    ["CJK", detail.breakdown.cjk],
    ["Emoji", detail.breakdown.emoji],
    [t("tool.token-counter.bdDigits"), detail.breakdown.digits],
    [t("tool.token-counter.bdPunct"), detail.breakdown.punctuation],
    [t("tool.token-counter.bdWhitespace"), detail.breakdown.whitespace],
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Token Counter</span>
          {chat && (
            <span className="rounded-md bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">
              {t("tool.token-counter.chatDetected")} · {chat.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>
          <Eraser className="size-3.5" /> {t("action.clear")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("tool.token-counter.placeholder")}
          spellCheck={false}
          className="min-h-48 w-full resize-y rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-[var(--muted-foreground)]">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <span>{t("tool.token-counter.estimateNote")}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label={t("tool.token-counter.tokens")} value={`~${fmt(inputTokens)}`} highlight />
          <Stat label={t("tool.token-counter.chars")} value={fmt(chars)} />
          <Stat label={t("tool.token-counter.words")} value={fmt(words)} />
          <Stat
            label={t("tool.token-counter.charsPerToken")}
            value={inputTokens > 0 ? (chars / inputTokens).toFixed(2) : "–"}
          />
        </div>

        {!chat && text && (
          <details className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium">{t("tool.token-counter.breakdown")}</summary>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-4">
              {breakdownRows.map(([label, n]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-[var(--muted-foreground)]">{label}</span>
                  <span className="font-mono">{fmt(n)}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {chat && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-xs">
            <div className="mb-2 font-medium">{t("tool.token-counter.perMessage")}</div>
            <div className="flex flex-col gap-1">
              {chat.map((m, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono text-[var(--primary)]">{m.role}</span>{" "}
                    <span className="text-[var(--muted-foreground)]">{m.text.slice(0, 80)}</span>
                  </span>
                  <span className="shrink-0 font-mono">~{fmt(estimateDetailed(m.text).tokens + 4)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[var(--muted-foreground)]">{t("tool.token-counter.overheadNote")}</div>
          </div>
        )}

        {/* Cost */}
        <section className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3">
          <div className="text-sm font-medium">{t("tool.token-counter.costTitle")}</div>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  presetId === p.id
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">{t("tool.token-counter.priceDisclaimer")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("tool.token-counter.inputPrice")}>
              <Input type="number" min={0} step="0.01" value={inPrice} onChange={(e) => { setInPrice(e.target.value); setPresetId(""); }} />
            </Field>
            <Field label={t("tool.token-counter.outputPrice")}>
              <Input type="number" min={0} step="0.01" value={outPrice} onChange={(e) => { setOutPrice(e.target.value); setPresetId(""); }} />
            </Field>
            <Field label={t("tool.token-counter.outputTokens")}>
              <Input type="number" min={0} step="1" value={outTokens} onChange={(e) => setOutTokens(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label={t("tool.token-counter.inputCost")} value={fmtUsd(estimateCost(inputTokens, 0, Number(inPrice), 0))} />
            <Stat label={t("tool.token-counter.outputCost")} value={fmtUsd(estimateCost(0, outN, 0, Number(outPrice)))} />
            <Stat label={t("tool.token-counter.totalCost")} value={fmtUsd(cost)} highlight />
          </div>
        </section>

        {/* Context window */}
        <section className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3">
          <div className="text-sm font-medium">{t("tool.token-counter.contextTitle")}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {CONTEXT_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => setCtx(String(c))}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                  ctxN === c
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {fmtCtx(c)}
              </button>
            ))}
            <Input type="number" min={1} value={ctx} onChange={(e) => setCtx(e.target.value)} className="h-8 w-36 font-mono" />
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className={cn("h-full rounded-full transition-all", share > 100 ? "bg-red-500" : share > 80 ? "bg-amber-500" : "bg-[var(--primary)]")}
              style={{ width: `${Math.min(100, share)}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted-foreground)]">
            <span>
              {t("tool.token-counter.inputPlusOutput")}: <span className="font-mono text-[var(--foreground)]">~{fmt(totalTokens)}</span> / <span className="font-mono">{fmt(ctxN)}</span>
            </span>
            <span className={cn("font-mono", share > 100 && "text-red-500")}>
              {share.toFixed(share < 1 ? 3 : 1)}%{share > 100 ? ` · ${t("tool.token-counter.overLimit")}` : ""}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
      <div className={cn("mt-1 font-mono text-sm", highlight && "text-lg font-semibold text-[var(--primary)]")}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}
