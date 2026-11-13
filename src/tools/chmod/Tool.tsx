import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import {
  PERMS,
  SPECIALS,
  WHO,
  hasBit,
  modeToChmodSymbolic,
  modeToOctal,
  modeToSymbolic,
  parseOctal,
  parseSymbolic,
  permBit,
  shellQuote,
  specialBit,
  toggleBit,
} from "./chmod";

const PRESETS: { mode: number; key: string }[] = [
  { mode: 0o644, key: "p644" },
  { mode: 0o755, key: "p755" },
  { mode: 0o600, key: "p600" },
  { mode: 0o700, key: "p700" },
  { mode: 0o664, key: "p664" },
  { mode: 0o775, key: "p775" },
  { mode: 0o400, key: "p400" },
  { mode: 0o777, key: "p777" },
  { mode: 0o4755, key: "p4755" },
  { mode: 0o2775, key: "p2775" },
  { mode: 0o1777, key: "p1777" },
];

const PERM_LETTER = { read: "r", write: "w", execute: "x" } as const;

export default function ChmodTool() {
  const { t } = useI18n();
  const [mode, setModeState] = useState(0o755);
  const [octalText, setOctalText] = useState("755");
  const [symText, setSymText] = useState("rwxr-xr-x");
  const [fileName, setFileName] = useState("file");
  const [recursive, setRecursive] = useState(false);

  const octalValid = parseOctal(octalText) !== null;
  const symValid = parseSymbolic(symText) !== null;

  const setMode = (m: number) => {
    setModeState(m);
    setOctalText(modeToOctal(m));
    setSymText(modeToSymbolic(m));
  };

  const onOctal = (v: string) => {
    setOctalText(v);
    const m = parseOctal(v);
    if (m !== null) {
      setModeState(m);
      setSymText(modeToSymbolic(m));
    }
  };

  const onSym = (v: string) => {
    setSymText(v);
    const m = parseSymbolic(v);
    if (m !== null) {
      setModeState(m);
      setOctalText(modeToOctal(m));
    }
  };

  const target = shellQuote(fileName.trim());
  const flag = recursive ? "-R " : "";
  const cmdOctal = `chmod ${flag}${modeToOctal(mode)} ${target}`;
  const cmdSym = `chmod ${flag}${modeToChmodSymbolic(mode)} ${target}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <Lock className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.chmod.title")}</span>
      </div>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.chmod.octal")}</span>
            <Input
              value={octalText}
              onChange={(e) => onOctal(e.target.value)}
              inputMode="numeric"
              spellCheck={false}
              className={cn("h-10 font-mono text-base", !octalValid && "border-red-500/50")}
            />
            {!octalValid && <span className="text-xs text-red-400">{t("tool.chmod.invalidOctal")}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.chmod.symbolic")}</span>
            <Input
              value={symText}
              onChange={(e) => onSym(e.target.value)}
              spellCheck={false}
              className={cn("h-10 font-mono text-base", !symValid && "border-red-500/50")}
            />
            {!symValid && <span className="text-xs text-red-400">{t("tool.chmod.invalidSymbolic")}</span>}
          </label>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium" />
                {PERMS.map((p) => (
                  <th key={p} className="px-3 py-2 font-medium">
                    {t(`tool.chmod.${p}`)} <span className="font-mono normal-case">({PERM_LETTER[p]})</span>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">{t("tool.chmod.value")}</th>
              </tr>
            </thead>
            <tbody>
              {WHO.map((who) => {
                const digit = (mode >> (who === "owner" ? 6 : who === "group" ? 3 : 0)) & 7;
                return (
                  <tr key={who} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{t(`tool.chmod.${who}`)}</td>
                    {PERMS.map((p) => {
                      const bit = permBit(who, p);
                      return (
                        <td key={p} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${t(`tool.chmod.${who}`)} ${t(`tool.chmod.${p}`)}`}
                            className="size-4 cursor-pointer accent-[var(--primary)]"
                            checked={hasBit(mode, bit)}
                            onChange={(e) => setMode(toggleBit(mode, bit, e.target.checked))}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-mono">{digit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t("tool.chmod.special")}</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SPECIALS.map((s) => {
              const bit = specialBit(s);
              return (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm" title={t(`tool.chmod.${s}Help`)}>
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={hasBit(mode, bit)}
                    onChange={(e) => setMode(toggleBit(mode, bit, e.target.checked))}
                  />
                  <span>{t(`tool.chmod.${s}`)}</span>
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">({bit.toString(8)})</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.chmod.fileName")}</span>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} className="font-mono" spellCheck={false} />
          </label>
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
            />
            {t("tool.chmod.recursive")} <span className="font-mono text-xs text-[var(--muted-foreground)]">-R</span>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {[cmdOctal, cmdSym].map((cmd) => (
            <div
              key={cmd}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2"
            >
              <code className="min-w-0 break-all font-mono text-sm">{cmd}</code>
              <CopyButton text={cmd} iconOnly />
            </div>
          ))}
          <div className="text-xs text-[var(--muted-foreground)]">
            ls -l: <span className="font-mono">-{modeToSymbolic(mode)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">{t("tool.chmod.presets")}</span>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant={mode === p.mode ? "secondary" : "outline"}
                size="sm"
                className="h-auto justify-start gap-3 py-1.5 text-left whitespace-normal"
                onClick={() => setMode(p.mode)}
              >
                <span className="font-mono">{modeToOctal(p.mode)}</span>
                <span className="font-normal text-[var(--muted-foreground)]">{t(`tool.chmod.preset.${p.key}`)}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
