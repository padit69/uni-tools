import { useMemo, useState } from "react";
import { FileImage } from "lucide-react";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

export default function DataUrlTool() {
  const { t } = useI18n();
  const [text, setText] = useState("hello world");
  const [mime, setMime] = useState("text/plain");
  const [url, setUrl] = useState("");
  const made = useMemo(() => `data:${mime};base64,${btoa(unescape(encodeURIComponent(text)))}`, [text, mime]);
  const parsed = useMemo(() => {
    const m = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!m) return null;
    try {
      return { mime: m[1] || "text/plain", base64: !!m[2], body: m[2] ? decodeURIComponent(escape(atob(m[3]))) : decodeURIComponent(m[3]) };
    } catch {
      return { mime: m[1] || "", base64: !!m[2], body: t("tool.dataUrl.parseError") };
    }
  }, [url, t]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b p-3 text-sm"><FileImage className="size-4" /><b>Data URL</b></div>
      <div className="grid flex-1 overflow-auto md:grid-cols-2">
        <div className="p-4">
          <input value={mime} onChange={(e) => setMime(e.target.value)} className="mb-2 h-9 w-full rounded border bg-transparent px-2 font-mono" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="h-40 w-full rounded border bg-transparent p-2 font-mono" />
          <div className="mt-2 break-all rounded border p-2 text-xs"><CopyButton text={made} />{made}</div>
        </div>
        <div className="p-4">
          <textarea value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("tool.dataUrl.paste")} className="h-40 w-full rounded border bg-transparent p-2 font-mono text-xs" />
          {parsed && <pre className="mt-2 whitespace-pre-wrap rounded border p-2 text-xs">{t("tool.dataUrl.mime")}: {parsed.mime}\n{t("tool.dataUrl.base64")}: {String(parsed.base64)}\n\n{parsed.body}</pre>}
        </div>
      </div>
    </div>
  );
}
