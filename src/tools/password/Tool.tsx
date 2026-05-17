import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Shield, KeyRound, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import {
  buildCharset,
  entropyBits,
  generatePassphrase,
  generatePassword,
  rateStrength,
  type PassphraseOptions,
  type RandomOptions,
  type Strength,
} from "./generate";
import { WORDS } from "./wordlist";

type Mode = "random" | "passphrase";

const SEPARATORS = ["-", "_", ".", " ", ""] as const;

export default function PasswordTool() {
  const [mode, setMode] = useState<Mode>("random");
  const [length, setLength] = useState(20);
  const [opts, setOpts] = useState<RandomOptions>({
    length: 20,
    lower: true,
    upper: true,
    digit: true,
    symbol: true,
    excludeAmbiguous: false,
  });
  const [pp, setPp] = useState<PassphraseOptions>({
    words: 4,
    separator: "-",
    capitalize: true,
    includeNumber: true,
  });

  const [items, setItems] = useState<string[]>([]);
  const [count, setCount] = useState(5);

  const charset = useMemo(() => buildCharset({ ...opts, length }), [opts, length]);

  const regen = () => {
    try {
      const list: string[] = [];
      for (let i = 0; i < count; i++) {
        if (mode === "random") {
          list.push(generatePassword({ ...opts, length }));
        } else {
          list.push(generatePassphrase(pp, WORDS));
        }
      }
      setItems(list);
    } catch (e) {
      toast.error("Error", { description: (e as Error).message });
    }
  };

  // initial fill
  useEffect(() => {
    regen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allText = items.join("\n");

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Password Generator</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeSwitch value={mode} onChange={setMode} />
          <label className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--muted-foreground)]">Count</span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => {
                const n = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                setCount(n);
              }}
              className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <Button onClick={regen} size="sm">
            <RefreshCw className="size-3.5" />
            Generate
          </Button>
          <CopyButton text={allText} label="Copy all" disabled={!items.length} />
        </div>
      </div>

      {/* Options */}
      <div className="border-b border-[var(--border)] bg-[var(--muted)]/15 px-4 py-3">
        {mode === "random" ? (
          <RandomOptionsPanel length={length} setLength={setLength} opts={opts} setOpts={setOpts} />
        ) : (
          <PassphraseOptionsPanel pp={pp} setPp={setPp} />
        )}
      </div>

      {/* Output list */}
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--muted-foreground)]">
            Click "Generate" to create passwords.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((p, i) => (
              <PasswordRow
                key={i}
                index={i + 1}
                password={p}
                charsetSize={mode === "random" ? charset.length : WORDS.length * pp.words}
                mode={mode}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub components ---------- */

function ModeSwitch({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
      <ModeButton current={value} target="random" onClick={() => onChange("random")}>
        <KeyRound className="size-3" /> Random
      </ModeButton>
      <ModeButton current={value} target="passphrase" onClick={() => onChange("passphrase")}>
        <MessagesSquare className="size-3" /> Passphrase
      </ModeButton>
    </div>
  );
}

function ModeButton({
  current,
  target,
  onClick,
  children,
}: {
  current: Mode;
  target: Mode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
        current === target
          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

function RandomOptionsPanel({
  length,
  setLength,
  opts,
  setOpts,
}: {
  length: number;
  setLength: (n: number) => void;
  opts: RandomOptions;
  setOpts: (o: RandomOptions) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <label className="flex flex-1 min-w-[200px] items-center gap-2">
        <span className="w-12 text-[var(--muted-foreground)]">Length</span>
        <input
          type="range"
          min={4}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="flex-1 accent-[var(--primary)]"
        />
        <input
          type="number"
          min={4}
          max={256}
          value={length}
          onChange={(e) => {
            const n = Math.max(4, Math.min(256, Number(e.target.value) || 4));
            setLength(n);
          }}
          className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Toggle
          label="a-z"
          checked={opts.lower}
          onChange={(v) => setOpts({ ...opts, lower: v })}
        />
        <Toggle
          label="A-Z"
          checked={opts.upper}
          onChange={(v) => setOpts({ ...opts, upper: v })}
        />
        <Toggle
          label="0-9"
          checked={opts.digit}
          onChange={(v) => setOpts({ ...opts, digit: v })}
        />
        <Toggle
          label="!@#"
          checked={opts.symbol}
          onChange={(v) => setOpts({ ...opts, symbol: v })}
        />
        <Toggle
          label="Exclude ambiguous characters"
          checked={opts.excludeAmbiguous}
          onChange={(v) => setOpts({ ...opts, excludeAmbiguous: v })}
        />
      </div>
    </div>
  );
}

function PassphraseOptionsPanel({
  pp,
  setPp,
}: {
  pp: PassphraseOptions;
  setPp: (o: PassphraseOptions) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <label className="flex items-center gap-2">
        <span className="text-[var(--muted-foreground)]">Word count</span>
        <input
          type="number"
          min={2}
          max={12}
          value={pp.words}
          onChange={(e) => {
            const n = Math.max(2, Math.min(12, Number(e.target.value) || 4));
            setPp({ ...pp, words: n });
          }}
          className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-[var(--muted-foreground)]">Separator</span>
        <div className="flex gap-0.5 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 p-0.5">
          {SEPARATORS.map((s) => (
            <button
              key={s}
              onClick={() => setPp({ ...pp, separator: s })}
              className={cn(
                "h-6 min-w-6 rounded px-1.5 font-mono text-xs",
                pp.separator === s
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              {s === "" ? "∅" : s === " " ? "␣" : s}
            </button>
          ))}
        </div>
      </label>
      <Toggle
        label="Capitalize first letter"
        checked={pp.capitalize}
        onChange={(v) => setPp({ ...pp, capitalize: v })}
      />
      <Toggle
        label="Add number"
        checked={pp.includeNumber}
        onChange={(v) => setPp({ ...pp, includeNumber: v })}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
        checked
          ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
          : "border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
      )}
    >
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

function PasswordRow({
  index,
  password,
  charsetSize,
  mode,
}: {
  index: number;
  password: string;
  charsetSize: number;
  mode: Mode;
}) {
  const bits = useMemo(() => {
    if (mode === "passphrase") {
      // approximate: each word = log2(WORDS.length) bits
      const wordBits = Math.log2(WORDS.length);
      const wordCount = password.split(/[^a-zA-Z]+/).filter(Boolean).length;
      return wordCount * wordBits;
    }
    return entropyBits(password, charsetSize);
  }, [password, charsetSize, mode]);

  const strength = rateStrength(bits);
  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
      <span className="w-6 shrink-0 text-right text-[10px] text-[var(--muted-foreground)]">
        {index}
      </span>
      <span className="flex-1 break-all font-mono text-sm">{password}</span>
      <StrengthBadge strength={strength} bits={bits} />
      <CopyButton text={password} iconOnly className="opacity-0 group-hover:opacity-100" />
    </li>
  );
}

function StrengthBadge({ strength, bits }: { strength: Strength; bits: number }) {
  const meta: Record<Strength, { label: string; cls: string }> = {
    "very-weak": { label: "Very weak", cls: "bg-red-500/15 text-red-400" },
    weak: { label: "Weak", cls: "bg-orange-500/15 text-orange-400" },
    fair: { label: "Fair", cls: "bg-yellow-500/15 text-yellow-400" },
    strong: { label: "Strong", cls: "bg-emerald-500/15 text-emerald-400" },
    "very-strong": { label: "Very strong", cls: "bg-emerald-500/20 text-emerald-300" },
  };
  const m = meta[strength];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", m.cls)}
      title={`~${Math.round(bits)} bits entropy`}
    >
      {m.label}
    </span>
  );
}
