import { useMemo, useState } from "react";
import { CaseSensitive, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";
import { CASE_IDS, convertText, type CaseId } from "./convert";

const LABELS: Record<CaseId, string> = {
  camel: "camelCase",
  pascal: "PascalCase",
  snake: "snake_case",
  constant: "CONSTANT_CASE",
  kebab: "kebab-case",
  train: "Train-Case",
  dot: "dot.case",
  path: "path/case",
  title: "Title Case",
  sentence: "Sentence case",
  lower: "lower case",
  upper: "UPPER CASE",
  slug: "slug",
};

export default function CaseConverterTool() {
  const { t } = useI18n();
  const [input, setInput] = useState("XMLHttpRequest handler — Xin chào thế giới");
  const [lineByLine, setLineByLine] = useState(false);
  const [removeDiacritics, setRemoveDiacritics] = useState(false);

  const results = useMemo(
    () => CASE_IDS.map((id) => ({ id, value: convertText(input, id, { lineByLine, removeDiacritics }) })),
    [input, lineByLine, removeDiacritics]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <CaseSensitive className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.case-converter.title")}</span>
      </div>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">{t("tool.case-converter.input")}</span>
            <div className="flex flex-wrap items-center gap-3">
              <Toggle label={t("tool.case-converter.lineByLine")} checked={lineByLine} onChange={setLineByLine} />
              <Toggle
                label={t("tool.case-converter.removeDiacritics")}
                checked={removeDiacritics}
                onChange={setRemoveDiacritics}
              />
              <Button variant="ghost" size="sm" onClick={() => setInput("")}>
                <Eraser className="size-3.5" />
                {t("tool.case-converter.clear")}
              </Button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("tool.case-converter.placeholder")}
            rows={4}
            spellCheck={false}
            className="min-h-24 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {results.map(({ id, value }) => (
            <div key={id} className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                  {LABELS[id]}
                </div>
                <CopyButton text={value} iconOnly />
              </div>
              <div className="mt-1 whitespace-pre-wrap break-all font-mono text-sm">
                {value || <span className="text-[var(--muted-foreground)]">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}
