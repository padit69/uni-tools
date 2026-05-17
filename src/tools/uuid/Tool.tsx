import { useState } from "react";
import { v4 as uuidv4, v7 as uuidv7, NIL } from "uuid";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";

type Version = "v4" | "v7" | "nil";

function generate(version: Version, count: number, uppercase: boolean): string[] {
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const id =
      version === "v4" ? uuidv4() : version === "v7" ? uuidv7() : NIL;
    list.push(uppercase ? id.toUpperCase() : id);
  }
  return list;
}

export default function UuidTool() {
  const { t } = useI18n();
  const [version, setVersion] = useState<Version>("v4");
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [ids, setIds] = useState<string[]>(() => generate("v4", 5, false));

  const regen = () => setIds(generate(version, count, uppercase));

  const display = ids.map((id) => (hyphens ? id : id.replace(/-/g, "")));
  const allText = display.join("\n");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Toggle
            options={[
              { v: "v4", label: t("uuid.v4") },
              { v: "v7", label: t("uuid.v7") },
              { v: "nil", label: t("uuid.nil") },
            ]}
            value={version}
            onChange={(v) => {
              setVersion(v);
              setIds(generate(v, count, uppercase));
            }}
          />
          <label className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--muted-foreground)]">{t("label.count")}</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => {
                const n = Math.max(1, Math.min(1000, Number(e.target.value) || 1));
                setCount(n);
              }}
              className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox label={t("uuid.uppercase")} checked={uppercase} onChange={setUppercase} />
          <Checkbox label={t("uuid.hyphens")} checked={hyphens} onChange={setHyphens} />
          <Button onClick={regen} size="sm">
            <RefreshCw className="size-3.5" /> {t("action.generate")}
          </Button>
          <CopyButton text={allText} label={t("action.copyAll")} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-sm">
        <ul className="flex flex-col gap-1">
          {display.map((id, i) => (
            <li
              key={i}
              className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5"
            >
              <span className="w-8 shrink-0 text-right text-[10px] text-[var(--muted-foreground)]">
                {i + 1}
              </span>
              <span className="flex-1 break-all">{id}</span>
              <CopyButton text={id} iconOnly className="opacity-0 group-hover:opacity-100" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded px-2 py-0.5 transition-colors",
            value === o.v
              ? "bg-[var(--card)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 py-1 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3 accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}
