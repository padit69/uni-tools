import { useEffect, useState } from "react";
import { ResultBox } from "@/components/tool/ToolLayout";
import { CopyButton } from "@/components/tool/CopyButton";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n";

const ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type Algo = (typeof ALGOS)[number];

async function hash(text: string, algo: Algo): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashTool() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<Algo, string>>({
    "SHA-1": "",
    "SHA-256": "",
    "SHA-384": "",
    "SHA-512": "",
  });

  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setHashes({ "SHA-1": "", "SHA-256": "", "SHA-384": "", "SHA-512": "" });
      return;
    }
    Promise.all(ALGOS.map((a) => hash(input, a))).then((vals) => {
      if (cancelled) return;
      const next = {} as Record<Algo, string>;
      ALGOS.forEach((a, i) => (next[a] = vals[i]));
      setHashes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2.5">
        <div className="text-sm">
          <span className="font-medium">Hash</span>
          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
            — Web Crypto
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          <Eraser className="size-3.5" /> {t("action.clear")}
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
          <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              {t("label.input")}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("tool.hash.placeholder")}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {ALGOS.map((a) => (
            <div key={a} className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  {a}
                </span>
                {hashes[a] && <CopyButton text={hashes[a]} />}
              </div>
              <div className="break-all p-3 font-mono text-xs">
                {hashes[a] || <span className="text-[var(--muted-foreground)]">—</span>}
              </div>
            </div>
          ))}
          <p className="px-1 text-[10px] text-[var(--muted-foreground)]">
            MD5 is not available because Web Crypto does not support it. Use SHA-256+ for security-sensitive use cases.
          </p>
        </div>
      </div>
    </div>
  );
}

// Suppress unused warning — ResultBox is exported from ToolLayout but may be used elsewhere.
void ResultBox;
