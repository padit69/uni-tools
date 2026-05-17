import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Barcode,
  Copy,
  Download,
  Eraser,
  ImagePlus,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  ScanLine,
  Shuffle,
  Type,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/cn";

type ECC = "L" | "M" | "Q" | "H";
type Mode = "text" | "url" | "email" | "phone" | "sms" | "wifi";
type Generator = "qr" | "barcode";

const SAMPLE = "https://uni-tool.dev";
const MODES: Array<{ value: Mode; label: string; icon: React.ReactNode }> = [
  { value: "text", label: "Text", icon: <Type className="size-3.5" /> },
  { value: "url", label: "URL", icon: <QrCode className="size-3.5" /> },
  { value: "email", label: "Email", icon: <Mail className="size-3.5" /> },
  { value: "phone", label: "Phone", icon: <Phone className="size-3.5" /> },
  { value: "sms", label: "SMS", icon: <MessageSquare className="size-3.5" /> },
  { value: "wifi", label: "Wi-Fi", icon: <Wifi className="size-3.5" /> },
];

const RANDOM_COLORS = [
  ["#0f172a", "#ffffff"],
  ["#14532d", "#f0fdf4"],
  ["#581c87", "#faf5ff"],
  ["#7f1d1d", "#fff7ed"],
  ["#0c4a6e", "#ecfeff"],
];

export default function QrTool() {
  const [generator, setGenerator] = useLocalStorage<Generator>("qr-generator", "qr");
  const [mode, setMode] = useLocalStorage<Mode>("qr-mode", "url");
  const [text, setText] = useLocalStorage("qr-text", SAMPLE);
  const [email, setEmail] = useState("hello@uni-tool.dev");
  const [subject, setSubject] = useState("Hello");
  const [phone, setPhone] = useState("+84901234567");
  const [sms, setSms] = useState("Hello from uni-tool");
  const [ssid, setSsid] = useState("My WiFi");
  const [password, setPassword] = useState("password123");
  const [wifiType, setWifiType] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [hidden, setHidden] = useState(false);
  const [size, setSize] = useLocalStorage("qr-size", 256);
  const [ecc, setEcc] = useLocalStorage<ECC>("qr-ecc", "M");
  const [margin, setMargin] = useLocalStorage("qr-margin", 2);
  const [dark, setDark] = useLocalStorage("qr-dark", "#0a0a0a");
  const [light, setLight] = useLocalStorage("qr-light", "#ffffff");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const payload = useMemo(() => {
    if (mode === "email") {
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      return `mailto:${email}${params.toString() ? `?${params}` : ""}`;
    }
    if (mode === "phone") return `tel:${phone}`;
    if (mode === "sms") return `SMSTO:${phone}:${sms}`;
    if (mode === "wifi") {
      const escapedSsid = ssid.replace(/([\\;,":])/g, "\\$1");
      const escapedPassword = password.replace(/([\\;,":])/g, "\\$1");
      return `WIFI:T:${wifiType};S:${escapedSsid};P:${escapedPassword};H:${hidden ? "true" : "false"};;`;
    }
    return text;
  }, [email, hidden, mode, password, phone, sms, ssid, subject, text, wifiType]);

  const barcodeSvg = useMemo(() => {
    if (generator !== "barcode" || !text.trim()) return "";
    try {
      return createCode128Svg(text.trim(), { dark, light, width: size, height: Math.max(96, Math.round(size * 0.34)) });
    } catch (e) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="120"><rect width="100%" height="100%" fill="${light}"/><text x="12" y="60" fill="#dc2626" font-family="monospace" font-size="12">${escapeXml((e as Error).message)}</text></svg>`;
    }
  }, [dark, generator, light, size, text]);

  useEffect(() => {
    if (generator !== "qr" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (!payload) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setError(null);
      return;
    }

    QRCode.toCanvas(canvas, payload, {
      width: size,
      margin,
      errorCorrectionLevel: ecc,
      color: { dark, light },
    }).then(
      () => {
        setError(null);
        if (!logo) return;
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const logoPx = Math.round(size * (logoSize / 100));
          const x = Math.round((canvas.width - logoPx) / 2);
          const y = Math.round((canvas.height - logoPx) / 2);
          ctx.fillStyle = light;
          ctx.fillRect(x - 6, y - 6, logoPx + 12, logoPx + 12);
          ctx.drawImage(img, x, y, logoPx, logoPx);
        };
        img.src = logo;
      },
      (e) => setError((e as Error).message)
    );
  }, [payload, size, ecc, margin, dark, light, logo, logoSize, generator]);

  const downloadPng = async () => {
    if (generator === "barcode") {
      await downloadSvgAsPng(barcodeSvg, "barcode.png");
      return;
    }
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "qr.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const downloadSvg = async () => {
    if (generator === "barcode") {
      downloadTextFile("barcode.svg", barcodeSvg, "image/svg+xml");
      return;
    }
    if (!payload) return;
    const svg = await QRCode.toString(payload, {
      type: "svg",
      margin,
      errorCorrectionLevel: ecc,
      color: { dark, light },
    });
    downloadTextFile("qr.svg", svg, "image/svg+xml");
  };

  const copyDataUrl = () => {
    if (generator === "barcode") {
      navigator.clipboard.writeText(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(barcodeSvg)}`);
      toast.success("Đã copy SVG data URL");
      return;
    }
    if (!canvasRef.current) return;
    navigator.clipboard.writeText(canvasRef.current.toDataURL("image/png"));
    toast.success("Đã copy PNG data URL");
  };

  const scanImage = async (file: File | undefined) => {
    if (!file) return;
    setScanResult([]);
    setScanError(null);
    const Detector = (window as unknown as { BarcodeDetector?: new (options?: unknown) => { detect: (source: ImageBitmap) => Promise<Array<{ rawValue: string; format: string }>> } }).BarcodeDetector;
    if (!Detector) {
      setScanError("Trình duyệt này chưa hỗ trợ BarcodeDetector. Hãy thử Chrome/Edge mới hơn.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new Detector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar"],
      });
      const codes = await detector.detect(bitmap);
      setScanResult(codes.map((code) => `${code.format}: ${code.rawValue}`));
      if (codes.length === 0) setScanError("Không đọc được QR/barcode trong ảnh này.");
    } catch (e) {
      setScanError((e as Error).message);
    }
  };

  const handleLogo = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  const randomizeColors = () => {
    const [nextDark, nextLight] = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
    setDark(nextDark);
    setLight(nextLight);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="text-sm font-medium">QR / Barcode</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setText("")} disabled={!payload} title="Xóa nội dung">
            <Eraser className="size-3.5" />
          </Button>
          <Button variant="secondary" size="icon" className="size-8" onClick={copyDataUrl} disabled={!payload || !!error} title="Copy PNG data URL">
            <Copy className="size-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadSvg} disabled={!payload || !!error}>
            SVG
          </Button>
          <Button size="sm" onClick={downloadPng} disabled={!payload || !!error}>
            <Download className="size-3.5" /> PNG
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="flex flex-col gap-3 overflow-y-auto border-b border-[var(--border)] p-4 md:border-b-0 md:border-r">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1 text-xs">
            <button onClick={() => setGenerator("qr")} className={cn("flex items-center justify-center gap-1 rounded-md px-2 py-1.5", generator === "qr" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
              <QrCode className="size-3.5" /> QR
            </button>
            <button onClick={() => setGenerator("barcode")} className={cn("flex items-center justify-center gap-1 rounded-md px-2 py-1.5", generator === "barcode" ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
              <Barcode className="size-3.5" /> Barcode
            </button>
          </div>

          {generator === "qr" ? (
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-1 text-xs">
            {MODES.map((item) => (
              <button
                key={item.value}
                onClick={() => setMode(item.value)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md px-2 py-1.5",
                  mode === item.value ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
          ) : null}

          {generator === "qr" ? (
          <PayloadFields
            mode={mode}
            text={text}
            setText={setText}
            email={email}
            setEmail={setEmail}
            subject={subject}
            setSubject={setSubject}
            phone={phone}
            setPhone={setPhone}
            sms={sms}
            setSms={setSms}
            ssid={ssid}
            setSsid={setSsid}
            password={password}
            setPassword={setPassword}
            wifiType={wifiType}
            setWifiType={setWifiType}
            hidden={hidden}
            setHidden={setHidden}
          />
          ) : (
            <TextInput label="Barcode value" value={text} onChange={setText} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Size">
              <input type="range" min={128} max={768} step={32} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
              <span className="self-end text-xs text-[var(--muted-foreground)]">{size}px</span>
            </Field>
            <Field label="Margin">
              <input type="range" min={0} max={8} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
              <span className="self-end text-xs text-[var(--muted-foreground)]">{margin}</span>
            </Field>
          </div>

          <Field label="Error correction">
            <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
              {(["L", "M", "Q", "H"] as ECC[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEcc(e)}
                  className={cn("flex-1 rounded px-2 py-1", ecc === e ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}
                  title={e === "L" ? "~7%" : e === "M" ? "~15%" : e === "Q" ? "~25%" : "~30%"}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <ColorField label="Foreground" value={dark} onChange={setDark} />
            <ColorField label="Background" value={light} onChange={setLight} />
            <Button variant="secondary" size="icon" className="mt-5 size-8" onClick={randomizeColors} title="Random colors">
              <Shuffle className="size-3.5" />
            </Button>
          </div>

          {generator === "qr" && (
          <Field label="Logo">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0])} />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-3.5" /> Chọn logo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLogo(null)} disabled={!logo}>
                Bỏ logo
              </Button>
            </div>
            <input type="range" min={10} max={30} value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-full accent-[var(--primary)]" disabled={!logo} />
          </Field>
          )}

        </div>

        <div className="grid min-h-0 grid-rows-[1fr_auto] overflow-hidden">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">{error}</div>
            ) : generator === "barcode" ? (
              <div className="rounded-lg bg-white p-4 shadow-2xl" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
            ) : (
              <div className="rounded-lg bg-white p-4 shadow-2xl">
                <canvas ref={canvasRef} />
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--muted)]/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ScanLine className="size-4 text-[var(--muted-foreground)]" />
                Read QR / Barcode
              </div>
              <div className="flex items-center gap-1">
                <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={(e) => scanImage(e.target.files?.[0])} />
                <Button variant="secondary" size="sm" onClick={() => scanRef.current?.click()}>
                  <ImagePlus className="size-3.5" /> Chọn ảnh
                </Button>
              </div>
            </div>

            {scanError ? (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-400">{scanError}</div>
            ) : scanResult.length > 0 ? (
              <div className="space-y-2">
                {scanResult.map((value) => (
                  <div
                    key={value}
                    className="group flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 break-all font-mono">{value}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => navigator.clipboard.writeText(value)}
                      title="Copy decoded value"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-3 text-xs text-[var(--muted-foreground)]">
                Upload ảnh chứa QR hoặc barcode để đọc nội dung.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayloadFields(props: {
  mode: Mode;
  text: string;
  setText: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  sms: string;
  setSms: (value: string) => void;
  ssid: string;
  setSsid: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  wifiType: "WPA" | "WEP" | "nopass";
  setWifiType: (value: "WPA" | "WEP" | "nopass") => void;
  hidden: boolean;
  setHidden: (value: boolean) => void;
}) {
  if (props.mode === "email") {
    return (
      <div className="grid grid-cols-1 gap-2">
        <TextInput label="Email" value={props.email} onChange={props.setEmail} />
        <TextInput label="Subject" value={props.subject} onChange={props.setSubject} />
      </div>
    );
  }
  if (props.mode === "phone") return <TextInput label="Phone" value={props.phone} onChange={props.setPhone} />;
  if (props.mode === "sms") {
    return (
      <div className="grid grid-cols-1 gap-2">
        <TextInput label="Phone" value={props.phone} onChange={props.setPhone} />
        <TextArea label="Message" value={props.sms} onChange={props.setSms} />
      </div>
    );
  }
  if (props.mode === "wifi") {
    return (
      <div className="grid grid-cols-1 gap-2">
        <TextInput label="SSID" value={props.ssid} onChange={props.setSsid} />
        <TextInput label="Password" value={props.password} onChange={props.setPassword} />
        <div className="flex items-center gap-2">
          <select value={props.wifiType} onChange={(e) => props.setWifiType(e.target.value as "WPA" | "WEP" | "nopass")} className="h-8 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 text-xs">
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">No password</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={props.hidden} onChange={(e) => props.setHidden(e.target.checked)} className="size-3 accent-[var(--primary)]" />
            Hidden
          </label>
        </div>
      </div>
    );
  }
  return <TextArea label={props.mode === "url" ? "URL" : "Content"} value={props.text} onChange={props.setText} />;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-transparent px-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" spellCheck={false} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL, text, hoặc bất kỳ chuỗi nào..." className="min-h-28 resize-y rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" spellCheck={false} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 cursor-pointer rounded-md border border-[var(--border)] bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2 font-mono text-xs" />
      </div>
    </label>
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

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function createCode128Svg(value: string, options: { dark: string; light: string; width: number; height: number }) {
  if (!value) throw new Error("Barcode value trống.");
  const codes = [104];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error("Code 128 B chỉ hỗ trợ ASCII 32-126.");
    codes.push(code - 32);
  }
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) checksum += codes[i] * i;
  codes.push(checksum % 103, 106);

  const quiet = 12;
  const textHeight = 22;
  const barHeight = options.height - textHeight;
  const totalModules = codes.reduce((sum, code) => {
    return sum + CODE128_PATTERNS[code].split("").reduce((part, n) => part + Number(n), 0);
  }, quiet * 2);
  const moduleWidth = options.width / totalModules;
  let x = quiet * moduleWidth;
  const bars: string[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    for (let i = 0; i < pattern.length; i++) {
      const w = Number(pattern[i]) * moduleWidth;
      if (i % 2 === 0) {
        bars.push(`<rect x="${x.toFixed(2)}" y="0" width="${Math.max(w, 0.8).toFixed(2)}" height="${barHeight}" fill="${options.dark}"/>`);
      }
      x += w;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
  <rect width="100%" height="100%" fill="${options.light}"/>
  ${bars.join("\n  ")}
  <text x="${options.width / 2}" y="${options.height - 6}" text-anchor="middle" fill="${options.dark}" font-family="monospace" font-size="14">${escapeXml(value)}</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "&") return "&amp;";
    if (char === "\"") return "&quot;";
    return "&apos;";
  });
}

function downloadTextFile(filename: string, content: string, type: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.click();
  URL.revokeObjectURL(link.href);
}

async function downloadSvgAsPng(svg: string, filename: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Không render được barcode PNG."));
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
