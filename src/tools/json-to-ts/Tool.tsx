import { useMemo, useState } from "react";
import { FileCode2, Eraser } from "lucide-react";
import { JsonEditor } from "@/tools/json/JsonEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { generateFromJson } from "./generate";

const SAMPLE = `{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "is-admin": false,
  "address": { "city": "Hanoi", "zip": "100000" },
  "tags": ["dev", "ops"],
  "orders": [
    { "id": 10, "total": 99.5, "note": null },
    { "id": 11, "total": 12, "coupon": "SALE" }
  ]
}`;

type Mode = "interface" | "type" | "zod";

export default function JsonToTsTool() {
  const { t } = useI18n();
  const [input, setInput] = useState(SAMPLE);
  const [rootName, setRootName] = useState("Root");
  const [mode, setMode] = useState<Mode>("interface");
  const [allOptional, setAllOptional] = useState(false);
  const [readonly, setReadonly] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, code: "" };
    try {
      return {
        ok: true as const,
        code: generateFromJson(input, {
          rootName,
          declaration: mode === "type" ? "type" : "interface",
          zod: mode === "zod",
          allOptional,
          readonly: mode !== "zod" && readonly,
        }),
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [input, rootName, mode, allOptional, readonly]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <FileCode2 className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">JSON → TypeScript</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">{t("tool.json-to-ts.rootName")}</span>
          <Input value={rootName} onChange={(e) => setRootName(e.target.value)} className="h-8 w-32 font-mono" />
        </label>
        <div className="inline-flex rounded-lg bg-[var(--muted)]/50 p-1">
          {(["interface", "type", "zod"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-6 rounded-md px-2.5 font-mono text-xs transition-all",
                mode === m
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {m === "zod" ? "Zod" : m}
            </button>
          ))}
        </div>
        <Check label={t("tool.json-to-ts.allOptional")} checked={allOptional} onChange={setAllOptional} />
        <Check
          label={t("tool.json-to-ts.readonly")}
          checked={readonly && mode !== "zod"}
          disabled={mode === "zod"}
          onChange={setReadonly}
        />
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setInput("")}>
            <Eraser className="size-3.5" />
            {t("tool.json-to-ts.clear")}
          </Button>
          <CopyButton text={result.ok ? result.code : ""} label={t("tool.json-to-ts.copy")} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <div className="flex min-h-[260px] flex-col border-b border-[var(--border)] md:border-b-0 md:border-r">
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">JSON</div>
          <div className="min-h-0 flex-1 overflow-auto">
            <JsonEditor
              value={input}
              onChange={setInput}
              lang="json"
              withLinter
              placeholder={t("tool.json-to-ts.inputPlaceholder")}
              height="100%"
              style={{ height: "100%" }}
            />
          </div>
        </div>
        <div className="flex min-h-[260px] flex-col">
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
            {mode === "zod" ? "Zod" : "TypeScript"}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {result.ok ? (
              <pre className="whitespace-pre p-4 font-mono text-xs leading-relaxed">
                {result.code || (
                  <span className="text-[var(--muted-foreground)]">{t("tool.json-to-ts.empty")}</span>
                )}
              </pre>
            ) : (
              <div className="m-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
                {t("tool.json-to-ts.invalidJson")}: {result.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center gap-1.5 text-xs", disabled && "opacity-50")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}
