import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";
import { buildCurl, buildFetch, buildHeader, decodeCredentials, encodeCredentials } from "./basicAuth";

export default function BasicAuthTool() {
  const { t } = useI18n();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState("https://api.example.com/resource");
  const [encoded, setEncoded] = useState("");

  const hasCreds = username !== "" || password !== "";
  const token = useMemo(() => (hasCreds ? encodeCredentials(username, password) : ""), [hasCreds, username, password]);
  const header = hasCreds ? buildHeader(username, password) : "";
  const curl = hasCreds ? buildCurl(username, password, url || "https://example.com") : "";
  const fetchSnippet = hasCreds ? buildFetch(username, password, url || "https://example.com") : "";
  const decoded = useMemo(() => (encoded.trim() ? decodeCredentials(encoded) : null), [encoded]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <KeyRound className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">Basic Auth</span>
      </div>
      <div className="flex flex-col gap-6 overflow-auto p-4">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t("tool.basic-auth.encodeTitle")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("tool.basic-auth.username")}>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="font-mono" autoComplete="off" spellCheck={false} />
            </Field>
            <Field label={t("tool.basic-auth.password")}>
              <div className="flex gap-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                  autoComplete="new-password"
                  spellCheck={false}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("tool.basic-auth.hidePassword") : t("tool.basic-auth.showPassword")}
                  title={showPassword ? t("tool.basic-auth.hidePassword") : t("tool.basic-auth.showPassword")}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </Field>
          </div>
          <Field label={t("tool.basic-auth.url")}>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" spellCheck={false} />
          </Field>
          {username.includes(":") && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-500">{t("tool.basic-auth.colonWarning")}</div>
          )}
          <Output label="Base64" value={token} />
          <Output label={t("tool.basic-auth.header")} value={header} />
          <Output label="curl" value={curl} />
          <Output label="fetch" value={fetchSnippet} multiline />
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
          <h2 className="text-sm font-semibold">{t("tool.basic-auth.decodeTitle")}</h2>
          <Field label={t("tool.basic-auth.decodeInput")}>
            <textarea
              value={encoded}
              onChange={(e) => setEncoded(e.target.value)}
              placeholder="Authorization: Basic dXNlcjpwYXNz"
              spellCheck={false}
              rows={3}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </Field>
          {decoded && !decoded.ok && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">{t(`tool.basic-auth.error.${decoded.error}`)}</div>
          )}
          {decoded && decoded.ok && (
            <div className="grid gap-2 md:grid-cols-2">
              <Output label={t("tool.basic-auth.username")} value={decoded.username} />
              <Output label={t("tool.basic-auth.password")} value={decoded.password} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

function Output({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
          {multiline ? (
            <pre className="mt-1 overflow-x-auto font-mono text-sm whitespace-pre">{value || "—"}</pre>
          ) : (
            <div className="mt-1 font-mono text-sm break-all">{value || "—"}</div>
          )}
        </div>
        <CopyButton text={value} iconOnly />
      </div>
    </div>
  );
}
