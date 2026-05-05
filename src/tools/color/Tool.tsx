import { useMemo, useState } from "react";
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import a11yPlugin from "colord/plugins/a11y";
import { Eraser, Palette } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";

extend([namesPlugin, a11yPlugin]);

function format(input: string) {
  const c = colord(input.trim() || "#000000");
  if (!c.isValid()) return null;
  const rgb = c.toRgb();
  const hsl = c.toHsl();
  const hsv = c.toHsv();
  return {
    hex: c.toHex(),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    rgba: rgb.a < 1 ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})` : null,
    hsl: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
    hsv: `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`,
    name: c.toName({ closest: true }) ?? null,
    luminance: c.luminance().toFixed(3),
    isLight: c.isLight(),
  };
}

const PRESETS = ["#fb923c", "#e879f9", "#818cf8", "#10b981", "#0ea5e9", "#f43f5e"];

export default function ColorTool() {
  const [input, setInput] = useState("#fb923c");

  const parsed = useMemo(() => format(input), [input]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Palette className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Color Converter</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          <Eraser className="size-3.5" /> Xóa
        </Button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="#fb923c · rgb(...) · hsl(...) · 'tomato'"
            className="h-10 flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            spellCheck={false}
          />
          <input
            type="color"
            value={parsed?.hex ?? "#000000"}
            onChange={(e) => setInput(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="size-7 rounded-md border border-white/20 ring-1 ring-black/10 transition-transform hover:scale-110"
              style={{ background: p }}
              title={p}
            />
          ))}
        </div>

        {!parsed && input.trim() && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
            "{input}" không phải màu hợp lệ.
          </div>
        )}

        {parsed && (
          <>
            <div
              className="flex h-32 items-end justify-between rounded-2xl p-4 shadow-lg ring-1 ring-white/10"
              style={{ background: parsed.hex }}
            >
              <span
                className={`font-mono text-sm font-medium ${parsed.isLight ? "text-zinc-900" : "text-white"}`}
              >
                {parsed.hex}
              </span>
              <span
                className={`text-xs ${parsed.isLight ? "text-zinc-700" : "text-white/70"}`}
              >
                luminance {parsed.luminance}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Row label="HEX" value={parsed.hex} />
              <Row label="RGB" value={parsed.rgb} />
              {parsed.rgba && <Row label="RGBA" value={parsed.rgba} />}
              <Row label="HSL" value={parsed.hsl} />
              <Row label="HSV" value={parsed.hsv} />
              {parsed.name && <Row label="Closest name" value={parsed.name} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-sm">{value}</div>
      </div>
      <CopyButton text={value} iconOnly className="opacity-0 group-hover:opacity-100" />
    </div>
  );
}
