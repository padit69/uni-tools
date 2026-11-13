import { useMemo, useState } from "react";
import { Binary } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";
import { bitLength, formatBigInt, groupBits, parseBigInt, signedWidth, twosComplement } from "./convert";

type FieldId = "bin" | "oct" | "dec" | "hex" | "custom";

export default function NumberBaseTool() {
  const { t } = useI18n();
  const [source, setSource] = useState<FieldId>("dec");
  const [raw, setRaw] = useState("255");
  const [customBase, setCustomBase] = useState(36);
  const [upper, setUpper] = useState(false);

  const fields: { id: FieldId; label: string; base: number }[] = [
    { id: "bin", label: t("tool.number-base.binary"), base: 2 },
    { id: "oct", label: t("tool.number-base.octal"), base: 8 },
    { id: "dec", label: t("tool.number-base.decimal"), base: 10 },
    { id: "hex", label: t("tool.number-base.hexadecimal"), base: 16 },
    { id: "custom", label: t("tool.number-base.custom"), base: customBase },
  ];
  const baseOf = (id: FieldId) => fields.find((f) => f.id === id)!.base;

  const parsed = useMemo(() => {
    try {
      return { value: parseBigInt(raw, baseOf(source)), error: null as string | null };
    } catch (e) {
      return { value: null, error: (e as Error).message };
    }
  }, [raw, source, customBase]);

  const value = parsed.value;

  const display = (id: FieldId, base: number) => {
    if (id === source) return raw;
    if (value == null) return "";
    return formatBigInt(value, base, upper);
  };

  const onEdit = (id: FieldId, text: string) => {
    setSource(id);
    setRaw(text);
  };

  const changeCustomBase = (b: number) => {
    // keep the current value when switching the custom base
    if (source === "custom" && value != null) {
      setSource("dec");
      setRaw(value.toString(10));
    }
    setCustomBase(b);
  };

  const bits = value == null ? 0 : bitLength(value);
  const magnitudeBits = value == null ? "" : (value < 0n ? -value : value).toString(2);
  const width = value != null && value < 0n ? signedWidth(value) : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <Binary className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.number-base.title")}</span>
      </div>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          {fields.map((f) => (
            <label key={f.id} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2 text-xs font-medium">
                {f.label}
                {f.id === "custom" ? (
                  <select
                    value={customBase}
                    onChange={(e) => changeCustomBase(Number(e.target.value))}
                    className="h-6 rounded-md border border-[var(--border)] bg-[var(--input)] px-1 text-xs"
                    aria-label={t("tool.number-base.base")}
                  >
                    {Array.from({ length: 35 }, (_, i) => i + 2).map((b) => (
                      <option key={b} value={b}>
                        {t("tool.number-base.base")} {b}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[var(--muted-foreground)]">({f.base})</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Input
                  value={display(f.id, f.base)}
                  onChange={(e) => onEdit(f.id, e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  className={
                    "h-10 font-mono " +
                    (f.id === source && parsed.error ? "border-red-500/60 focus-visible:ring-red-500/40" : "")
                  }
                />
                <CopyButton text={display(f.id, f.base)} iconOnly />
              </div>
              {f.id === source && parsed.error && <span className="text-xs text-red-400">{parsed.error}</span>}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={upper}
            onChange={(e) => setUpper(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          {t("tool.number-base.uppercase")}
        </label>

        {value != null && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-[var(--muted-foreground)]">{t("tool.number-base.bitLength")}: </span>
                <span className="font-mono">{bits}</span>
              </span>
              <span>
                <span className="text-[var(--muted-foreground)]">{t("tool.number-base.byteLength")}: </span>
                <span className="font-mono">{Math.ceil(bits / 8)}</span>
              </span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                {t("tool.number-base.bits")}
                {value < 0n && ` (${t("tool.number-base.magnitude")})`}
              </div>
              <div className="mt-1 break-words font-mono text-sm">
                {value < 0n && "-"}
                {groupBits(magnitudeBits)}
              </div>
            </div>
            {value < 0n && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                  {t("tool.number-base.twosComplement")} ({width}-bit)
                </div>
                <div className="mt-1 break-words font-mono text-sm">{groupBits(twosComplement(value, width))}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
