import { useMemo, useState } from "react";
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import a11yPlugin from "colord/plugins/a11y";
import { Copy, Eraser, Palette, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";

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
const GRADIENT_PRESETS = [
  ["#0ea5e9", "#10b981"],
  ["#f43f5e", "#f59e0b"],
  ["#111827", "#818cf8"],
  ["#22c55e", "#facc15"],
  ["#ec4899", "#06b6d4"],
];
type GradientType = "linear" | "radial" | "conic";

export default function ColorTool() {
  const [input, setInput] = useState("#fb923c");
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState([
    { color: "#0ea5e9", pos: 0 },
    { color: "#10b981", pos: 100 },
  ]);

  const parsed = useMemo(() => format(input), [input]);
  const gradientCss = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const stopText = sorted.map((stop) => `${stop.color} ${stop.pos}%`).join(", ");
    if (gradientType === "radial") return `radial-gradient(circle, ${stopText})`;
    if (gradientType === "conic") return `conic-gradient(from ${angle}deg, ${stopText})`;
    return `linear-gradient(${angle}deg, ${stopText})`;
  }, [angle, gradientType, stops]);

  const updateStop = (index: number, patch: Partial<{ color: string; pos: number }>) => {
    setStops((current) => current.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)));
  };

  const addStop = () => {
    setStops((current) => [...current, { color: parsed?.hex ?? "#ffffff", pos: 50 }].slice(0, 6));
  };

  const randomGradient = () => {
    const preset = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
    setStops(preset.map((color, index) => ({ color, pos: index * 100 })));
    setAngle([45, 90, 135, 180, 225][Math.floor(Math.random() * 5)]);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Palette className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Color Converter</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          <Eraser className="size-3.5" /> Clear
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
            "{input}" is not a valid color.
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

        <div className="border-t border-[var(--border)] pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Gradient</div>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="icon" className="size-8" onClick={randomGradient} title="Random gradient">
                <Shuffle className="size-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                onClick={() => navigator.clipboard.writeText(`background: ${gradientCss};`)}
                title="Copy CSS"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div
              className="min-h-44 rounded-lg border border-[var(--border)] shadow-lg"
              style={{ background: gradientCss }}
            />
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1 text-xs">
                {(["linear", "radial", "conic"] as GradientType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setGradientType(type)}
                    className={cn(
                      "rounded-md px-2 py-1.5 capitalize",
                      gradientType === type ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {gradientType !== "radial" && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Angle</span>
                  <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="accent-[var(--primary)]" />
                  <span className="self-end text-xs text-[var(--muted-foreground)]">{angle}deg</span>
                </label>
              )}

              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div key={index} className="grid grid-cols-[36px_1fr_64px_28px] items-center gap-2">
                    <input type="color" value={stop.color} onChange={(e) => updateStop(index, { color: e.target.value })} className="h-8 w-9 cursor-pointer rounded-md border border-[var(--border)] bg-transparent" />
                    <input value={stop.color} onChange={(e) => updateStop(index, { color: e.target.value })} className="h-8 min-w-0 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 font-mono text-xs" />
                    <input type="number" min={0} max={100} value={stop.pos} onChange={(e) => updateStop(index, { pos: Number(e.target.value) })} className="h-8 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 text-xs" />
                    <button
                      onClick={() => setStops((current) => current.filter((_, i) => i !== index))}
                      disabled={stops.length <= 2}
                      className="h-8 rounded-md border border-[var(--border)] text-xs disabled:opacity-40"
                      title="Remove stop"
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="secondary" size="sm" onClick={addStop} disabled={stops.length >= 6}>
                Add stop
              </Button>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">CSS</div>
                <div className="mt-1 break-all font-mono text-xs">background: {gradientCss};</div>
              </div>
            </div>
          </div>
        </div>
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
