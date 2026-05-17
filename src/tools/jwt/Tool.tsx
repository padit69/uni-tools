import { useMemo, useState } from "react";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { Eraser, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

interface Decoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function decode(token: string, t: (key: string) => string): Decoded {
  const trimmed = token.trim();
  if (!trimmed) throw new Error(t("tool.jwt.emptyToken"));
  const parts = trimmed.split(".");
  if (parts.length !== 3) throw new Error(t("tool.jwt.partsError"));
  const header = decodeProtectedHeader(trimmed) as Record<string, unknown>;
  const payload = decodeJwt(trimmed) as Record<string, unknown>;
  return { header, payload, signature: parts[2] };
}

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

export default function JwtTool() {
  const { t } = useI18n();
  const [token, setToken] = useState("");

  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    try {
      return { ok: true as const, value: decode(token, t) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [token, t]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <KeyRound className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">JWT Decoder</span>
          <span className="text-xs text-[var(--muted-foreground)]">{t("tool.jwt.subtitle")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setToken(SAMPLE)} disabled={!!token}>
            {t("json.example")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setToken("")} disabled={!token}>
            <Eraser className="size-3.5" /> {t("action.clear")}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
          <PaneHeader label={t("tool.jwt.token")} />
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t("tool.jwt.placeholder")}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-xs focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col overflow-y-auto">
          {!decoded && <Empty>{t("tool.jwt.empty")}</Empty>}
          {decoded?.ok === false && (
            <div className="m-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
              {decoded.error}
            </div>
          )}
          {decoded?.ok && (
            <div className="flex flex-col gap-3 p-3">
              <Section
                title={t("tool.jwt.header")}
                color="text-fuchsia-400"
                value={JSON.stringify(decoded.value.header, null, 2)}
              />
              <Section
                title={t("tool.jwt.payload")}
                color="text-emerald-400"
                value={JSON.stringify(decoded.value.payload, null, 2)}
                extras={<Claims claims={decoded.value.payload} />}
              />
              <Section
                title={t("tool.jwt.signature")}
                color="text-sky-400"
                value={decoded.value.signature}
                mono
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-[var(--muted-foreground)]">
      {children}
    </div>
  );
}

function Section({
  title,
  color,
  value,
  mono,
  extras,
}: {
  title: string;
  color: string;
  value: string;
  mono?: boolean;
  extras?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${color}`}>
          {title}
        </span>
        <CopyButton text={value} />
      </div>
      <pre className={`overflow-auto p-3 text-xs ${mono ? "font-mono break-all whitespace-pre-wrap" : "font-mono"}`}>
        {value}
      </pre>
      {extras}
    </div>
  );
}

function Claims({ claims }: { claims: Record<string, unknown> }) {
  const items: Array<[string, string, string?]> = [];
  if (typeof claims.exp === "number") {
    const d = new Date(claims.exp * 1000);
    const expired = d.getTime() < Date.now();
    items.push([
      "exp",
      `${d.toLocaleString()} (${formatDistanceToNow(d, { addSuffix: true })})`,
      expired ? "text-red-400" : "text-emerald-400",
    ]);
  }
  if (typeof claims.iat === "number") {
    const d = new Date(claims.iat * 1000);
    items.push(["iat", `${d.toLocaleString()} (${formatDistanceToNow(d, { addSuffix: true })})`]);
  }
  if (typeof claims.nbf === "number") {
    const d = new Date(claims.nbf * 1000);
    items.push(["nbf", d.toLocaleString()]);
  }
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 border-t border-[var(--border)] px-3 py-2 text-xs">
      {items.map(([k, v, color]) => (
        <div key={k} className="flex justify-between gap-3">
          <span className="font-mono text-[var(--muted-foreground)]">{k}</span>
          <span className={color ?? ""}>{v}</span>
        </div>
      ))}
    </div>
  );
}
