import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

function b64u(s: string) {
  return btoa(unescape(encodeURIComponent(s))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function dec(s: string) {
  return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="))));
}
async function sign(data: string, secret: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  let x = "";
  sig.forEach((b) => x += String.fromCharCode(b));
  return btoa(x).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export default function JwtSignTool() {
  const { t } = useI18n();
  const [payload, setPayload] = useState('{\n  "sub": "123",\n  "name": "Alex",\n  "iat": 1710000000\n}');
  const [secret, setSecret] = useState("secret");
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState<string>("");
  const generated = useMemo(() => ({ header: b64u(JSON.stringify({ alg: "HS256", typ: "JWT" })), payload: b64u(payload) }), [payload]);

  async function make() {
    try {
      const data = `${generated.header}.${generated.payload}`;
      setToken(`${data}.${await sign(data, secret)}`);
    } catch (e) {
      setToken(`${t("label.error")}: ${(e as Error).message}`);
    }
  }

  async function verify() {
    try {
      const [a, b, c] = token.split(".");
      if (!a || !b || !c) throw Error(t("tool.jwtSign.partsError"));
      const expected = await sign(`${a}.${b}`, secret);
      setVerified(
        expected === c
          ? `${t("tool.jwtSign.valid")}\n\nHeader:\n${JSON.stringify(JSON.parse(dec(a)), null, 2)}\n\nPayload:\n${JSON.stringify(JSON.parse(dec(b)), null, 2)}`
          : `${t("tool.jwtSign.invalidSignature")}\n${t("tool.jwtSign.expected")}: ${expected}`,
      );
    } catch (e) {
      setVerified(`${t("label.error")}: ${(e as Error).message}`);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm"><ShieldCheck className="size-4" /><b>JWT Sign / Verify</b></div>
      <div className="grid flex-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col gap-3 overflow-auto border-r p-4">
          <label className="text-xs">{t("label.secret")}<input value={secret} onChange={(e) => setSecret(e.target.value)} className="mt-1 h-9 w-full rounded border bg-transparent px-2 font-mono" /></label>
          <label className="min-h-0 flex-1 text-xs">{t("label.payloadJson")}<textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="mt-1 h-48 w-full rounded border bg-transparent p-2 font-mono" /></label>
          <button onClick={make} className="rounded bg-[var(--accent)] px-3 py-2 text-sm">{t("tool.jwtSign.sign")}</button>
        </div>
        <div className="flex flex-col gap-3 overflow-auto p-4">
          <textarea value={token} onChange={(e) => setToken(e.target.value)} placeholder={t("tool.jwt.placeholder")} className="h-36 rounded border bg-transparent p-2 font-mono text-xs" />
          <div>{token && <CopyButton text={token} />}</div>
          <button onClick={verify} className="rounded border px-3 py-2 text-sm">{t("tool.jwtSign.verify")}</button>
          <pre className="whitespace-pre-wrap rounded border bg-[var(--muted)]/20 p-3 text-xs">{verified || "—"}</pre>
        </div>
      </div>
    </div>
  );
}
