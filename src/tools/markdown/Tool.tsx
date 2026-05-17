import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Eraser, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { useI18n } from "@/i18n";

const SAMPLE = `# Uni Tools

A versatile developer toolbox, **runs 100% in your browser**.

## Features

- JSON format, validate, tree, convert
- Encode/decode (Base64, URL, JWT)
- Generators (UUID, hash, QR, lorem)
- ...and more.

## Code

\`\`\`ts
const greet = (name: string) => \`Hello, \${name}!\`;
console.log(greet("uni-tools"));
\`\`\`

> Privacy first — no backend, no tracking.

[Home](https://example.com)
`;

export default function MarkdownTool() {
  const { t } = useI18n();
  const [input, setInput] = useState(SAMPLE);
  const [html, setHtml] = useState("");

  const rawHtml = useMemo(() => marked.parse(input, { async: false }) as string, [input]);

  useEffect(() => {
    setHtml(DOMPurify.sanitize(rawHtml));
  }, [rawHtml]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-[var(--muted-foreground)]" />
          <span className="font-medium">Markdown</span>
          <span className="text-xs text-[var(--muted-foreground)]">— marked + DOMPurify</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={html} label={t("tool.markdown.copyHtml")} />
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            <Eraser className="size-3.5" /> {t("action.clear")}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="flex flex-col overflow-hidden border-b border-[var(--border)] md:border-b-0 md:border-r">
          <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              Markdown
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("tool.markdown.placeholder")}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="flex h-9 shrink-0 items-center border-b border-[var(--border)] px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              {t("label.preview")}
            </span>
          </div>
          <div
            className="md-preview min-h-0 flex-1 overflow-auto p-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
