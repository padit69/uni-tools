import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type ECC = "L" | "M" | "Q" | "H";

const SAMPLE = "https://uni-tool.dev";

export default function QrTool() {
  const [text, setText] = useState(SAMPLE);
  const [size, setSize] = useState(256);
  const [ecc, setEcc] = useState<ECC>("M");
  const [margin, setMargin] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!text) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setError(null);
      return;
    }
    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      margin,
      errorCorrectionLevel: ecc,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).then(
      () => setError(null),
      (e) => setError((e as Error).message)
    );
  }, [text, size, ecc, margin]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "qr.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="text-sm font-medium">QR Generator</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>
            <Eraser className="size-3.5" /> Xóa
          </Button>
          <Button size="sm" onClick={download} disabled={!text || !!error}>
            <Download className="size-3.5" /> PNG
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3 overflow-y-auto border-b border-[var(--border)] p-4 md:border-b-0 md:border-r">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Nội dung</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="URL, text, hoặc bất kỳ chuỗi nào..."
              className="min-h-32 rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              spellCheck={false}
            />
          </label>

          <Field label="Size">
            <input
              type="range"
              min={128}
              max={512}
              step={32}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <span className="self-end text-xs text-[var(--muted-foreground)]">{size}px</span>
          </Field>

          <Field label="Error correction">
            <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
              {(["L", "M", "Q", "H"] as ECC[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEcc(e)}
                  className={cn(
                    "flex-1 rounded px-2 py-1",
                    ecc === e ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                  title={
                    e === "L" ? "~7%" : e === "M" ? "~15%" : e === "Q" ? "~25%" : "~30%"
                  }
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Margin">
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </Field>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
              {error}
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-4 shadow-2xl">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}
