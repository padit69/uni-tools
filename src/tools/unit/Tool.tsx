import { useMemo, useState } from "react";
import { Ruler } from "lucide-react";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";

type Category = "length" | "weight" | "temperature";

interface UnitDef {
  id: string;
  labelKey: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

// Length: base = meter
// Weight: base = gram
// Temperature: base = celsius
const LENGTHS: UnitDef[] = [
  { id: "mm", labelKey: "unit.millimeter", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
  { id: "cm", labelKey: "unit.centimeter", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
  { id: "m", labelKey: "unit.meter", toBase: (v) => v, fromBase: (v) => v },
  { id: "km", labelKey: "unit.kilometer", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  { id: "in", labelKey: "unit.inch", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
  { id: "ft", labelKey: "unit.foot", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
  { id: "yd", labelKey: "unit.yard", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
  { id: "mi", labelKey: "unit.mile", toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
];

const WEIGHTS: UnitDef[] = [
  { id: "mg", labelKey: "unit.milligram", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
  { id: "g", labelKey: "unit.gram", toBase: (v) => v, fromBase: (v) => v },
  { id: "kg", labelKey: "unit.kilogram", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  { id: "t", labelKey: "unit.tonne", toBase: (v) => v * 1_000_000, fromBase: (v) => v / 1_000_000 },
  { id: "oz", labelKey: "unit.ounce", toBase: (v) => v * 28.3495, fromBase: (v) => v / 28.3495 },
  { id: "lb", labelKey: "unit.pound", toBase: (v) => v * 453.592, fromBase: (v) => v / 453.592 },
];

const TEMPS: UnitDef[] = [
  { id: "c", labelKey: "unit.celsius", toBase: (v) => v, fromBase: (v) => v },
  { id: "f", labelKey: "unit.fahrenheit", toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32 },
  { id: "k", labelKey: "unit.kelvin", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
];

const CATEGORIES: Record<Category, { labelKey: string; units: UnitDef[] }> = {
  length: { labelKey: "unit.length", units: LENGTHS },
  weight: { labelKey: "unit.weight", units: WEIGHTS },
  temperature: { labelKey: "unit.temperature", units: TEMPS },
};

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e12 || (n !== 0 && Math.abs(n) < 1e-6)) return n.toExponential(4);
  // Trim trailing zeros while keeping precision
  return parseFloat(n.toFixed(8)).toString();
}

export default function UnitTool() {
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>("length");
  const [from, setFrom] = useState<string>("m");
  const [value, setValue] = useState<string>("1");

  const cat = CATEGORIES[category];

  const computed = useMemo(() => {
    const num = parseFloat(value);
    if (!isFinite(num)) return null;
    const def = cat.units.find((u) => u.id === from);
    if (!def) return null;
    const base = def.toBase(num);
    return cat.units.map((u) => ({ id: u.id, labelKey: u.labelKey, value: u.fromBase(base) }));
  }, [value, from, cat]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Ruler className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">{t("unit.converter")}</span>
        </div>
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setFrom(CATEGORIES[c].units[0].id);
              }}
              className={cn(
                "rounded px-2 py-0.5",
                category === c ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {t(CATEGORIES[c].labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium">{t("label.value")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("label.from")}</span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {cat.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {t(u.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!computed && value && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
            "{value}" {t("error.invalidNumber")}
          </div>
        )}

        {computed && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {computed.map((r) => {
              const text = fmt(r.value);
              return (
                <div
                  key={r.id}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                    r.id === from
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                      : "border-[var(--border)] bg-[var(--muted)]/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                      {t(r.labelKey)}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-sm">{text}</div>
                  </div>
                  <CopyButton text={text} iconOnly className="opacity-0 group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
