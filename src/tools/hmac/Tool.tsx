import { useEffect, useMemo, useState } from "react";
import { Eraser, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";

const ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type Algo = (typeof ALGOS)[number];
type Output = "hex" | "base64";

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
async function hmac(message: string, secret: string, algo: Algo, output: Output) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: algo }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return output === "hex" ? hex(sig) : b64(sig);
}

export default function HmacTool() {
  const [message, setMessage] = useState("hello=world&ts=1710000000");
  const [secret, setSecret] = useState("secret");
  const [output, setOutput] = useState<Output>("hex");
  const [results, setResults] = useState<Record<Algo, string>>({ "SHA-1": "", "SHA-256": "", "SHA-384": "", "SHA-512": "" });

  useEffect(() => {
    let cancelled = false;
    if (!message || !secret) {
      setResults({ "SHA-1": "", "SHA-256": "", "SHA-384": "", "SHA-512": "" });
      return;
    }
    Promise.all(ALGOS.map((a) => hmac(message, secret, a, output))).then((vals) => {
      if (cancelled) return;
      const next = {} as Record<Algo, string>;
      ALGOS.forEach((a, i) => (next[a] = vals[i]));
      setResults(next);
    });
    return () => { cancelled = true; };
  }, [message, secret, output]);

  const sampleHeader = useMemo(() => results["SHA-256"] ? `X-Signature: sha256=${results["SHA-256"]}` : "", [results]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm"><KeyRound className="size-4 text-[var(--muted-foreground)]"/><span className="font-medium">HMAC Generator</span></div>
        <div className="flex items-center gap-2">
          <select value={output} onChange={(e) => setOutput(e.target.value as Output)} className="h-8 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-2 text-xs">
            <option value="hex">HEX</option><option value="base64">Base64</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => { setMessage(""); setSecret(""); }} disabled={!message && !secret}><Eraser className="size-3.5"/> Xóa</Button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col gap-3 overflow-auto border-b border-[var(--border)] p-4 md:border-b-0 md:border-r">
          <label className="flex flex-col gap-1.5"><span className="text-xs font-medium">Secret key</span><input value={secret} onChange={(e)=>setSecret(e.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 font-mono text-sm outline-none"/></label>
          <label className="flex min-h-0 flex-1 flex-col gap-1.5"><span className="text-xs font-medium">Message / payload</span><textarea value={message} onChange={(e)=>setMessage(e.target.value)} spellCheck={false} className="min-h-[260px] flex-1 resize-none rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-sm outline-none"/></label>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {ALGOS.map((a) => <Result key={a} label={`HMAC ${a}`} value={results[a]} />)}
          {sampleHeader && <Result label="Webhook header mẫu" value={sampleHeader} />}
        </div>
      </div>
    </div>
  );
}
function Result({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20"><div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2"><span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>{value && <CopyButton text={value}/>}</div><div className="break-all p-3 font-mono text-xs">{value || <span className="text-[var(--muted-foreground)]">—</span>}</div></div>;
}
