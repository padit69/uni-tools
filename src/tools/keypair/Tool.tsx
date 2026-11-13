import { useEffect, useState } from "react";
import { Download, KeySquare, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import {
  generateKeyPair,
  isEd25519Supported,
  keyFileBase,
  type EcCurve,
  type GeneratedKeyPair,
  type KeyConfig,
  type KeyFamily,
  type RsaAlgorithm,
  type RsaSize,
} from "./keygen";

const RSA_ALGS: RsaAlgorithm[] = ["RSA-OAEP", "RSASSA-PKCS1-v1_5", "RSA-PSS"];
const RSA_SIZES: RsaSize[] = [2048, 3072, 4096];
const CURVES: EcCurve[] = ["P-256", "P-384", "P-521"];

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function KeyPairTool() {
  const { t } = useI18n();
  const [family, setFamily] = useState<KeyFamily>("RSA");
  const [rsaAlg, setRsaAlg] = useState<RsaAlgorithm>("RSA-OAEP");
  const [rsaSize, setRsaSize] = useState<RsaSize>(2048);
  const [curve, setCurve] = useState<EcCurve>("P-256");
  const [edSupported, setEdSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ config: KeyConfig; keys: GeneratedKeyPair } | null>(null);

  useEffect(() => {
    let alive = true;
    isEd25519Supported().then((ok) => alive && setEdSupported(ok));
    return () => {
      alive = false;
    };
  }, []);

  const families: KeyFamily[] = edSupported ? ["RSA", "ECDSA", "Ed25519"] : ["RSA", "ECDSA"];

  const generate = async () => {
    const config: KeyConfig =
      family === "RSA" ? { family, algorithm: rsaAlg, modulusLength: rsaSize } : family === "ECDSA" ? { family, curve } : { family };
    setBusy(true);
    setError("");
    try {
      // Yield a frame so the spinner renders before the (potentially slow) RSA generation.
      await new Promise((r) => setTimeout(r, 16));
      const keys = await generateKeyPair(config);
      setResult({ config, keys });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const base = result ? keyFileBase(result.config) : "key";
  const publicJwk = result ? JSON.stringify(result.keys.publicJwk, null, 2) : "";
  const privateJwk = result ? JSON.stringify(result.keys.privateJwk, null, 2) : "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <KeySquare className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">{t("tool.keypair.title")}</span>
      </div>
      <div className="flex flex-col gap-4 overflow-auto p-4">
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>{t("tool.keypair.privacyNote")}</span>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-3">
          <OptionRow label={t("tool.keypair.algorithm")}>
            <Segmented value={family} onChange={setFamily} options={families.map((f) => ({ value: f, label: f }))} />
          </OptionRow>
          {family === "RSA" && (
            <>
              <OptionRow label={t("tool.keypair.scheme")}>
                <Segmented value={rsaAlg} onChange={setRsaAlg} options={RSA_ALGS.map((a) => ({ value: a, label: a }))} />
              </OptionRow>
              <OptionRow label={t("tool.keypair.keySize")}>
                <Segmented value={rsaSize} onChange={setRsaSize} options={RSA_SIZES.map((s) => ({ value: s, label: `${s} bit` }))} />
              </OptionRow>
              {rsaSize === 4096 && <p className="text-[11px] text-[var(--muted-foreground)]">{t("tool.keypair.slowHint")}</p>}
            </>
          )}
          {family === "ECDSA" && (
            <OptionRow label={t("tool.keypair.curve")}>
              <Segmented value={curve} onChange={setCurve} options={CURVES.map((c) => ({ value: c, label: c }))} />
            </OptionRow>
          )}
          <div>
            <Button onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <KeySquare className="size-4" />}
              {busy ? t("tool.keypair.generating") : t("tool.keypair.generate")}
            </Button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">{t("tool.keypair.error")}: {error}</div>}

        {result && (
          <div className={cn("flex flex-col gap-3", busy && "opacity-50")}>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t("tool.keypair.fingerprint")}</div>
                  <div className="mt-1 font-mono text-xs break-all">SHA256:{result.keys.fingerprintBase64}</div>
                  <div className="mt-1 font-mono text-[11px] break-all text-[var(--muted-foreground)]">{result.keys.fingerprintHex}</div>
                </div>
                <CopyButton text={result.keys.fingerprintHex} iconOnly />
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <KeyBlock title={t("tool.keypair.publicPem")} value={result.keys.publicPem} filename={`${base}-public.pem`} mime="application/x-pem-file" />
              <KeyBlock title={t("tool.keypair.privatePem")} value={result.keys.privatePem} filename={`${base}-private.pem`} mime="application/x-pem-file" secret />
              <KeyBlock title={t("tool.keypair.publicJwk")} value={publicJwk} filename={`${base}-public.jwk.json`} mime="application/json" />
              <KeyBlock title={t("tool.keypair.privateJwk")} value={privateJwk} filename={`${base}-private.jwk.json`} mime="application/json" secret />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-28 shrink-0 text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-[var(--muted)]/50 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 rounded-md px-3 text-xs font-medium transition-all",
            value === o.value
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KeyBlock({ title, value, filename, mime, secret }: { title: string; value: string; filename: string; mime: string; secret?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <span className={cn("text-xs font-medium", secret ? "text-amber-500" : "text-[var(--muted-foreground)]")}>{title}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => download(filename, value, mime)}>
            <Download className="size-3.5" />
            {t("tool.keypair.download")}
          </Button>
          <CopyButton text={value} iconOnly />
        </div>
      </div>
      <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre">{value}</pre>
    </div>
  );
}
