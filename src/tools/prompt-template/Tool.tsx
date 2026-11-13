import { useMemo, useState } from "react";
import { FileText, Save, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import {
  MAX_SAVED,
  exportAnthropicMessages,
  exportJsTemplate,
  exportJson,
  exportOpenAIMessages,
  loadSaved,
  parseVariables,
  persistSaved,
  renderSegments,
  type SavedTemplate,
} from "./template";

const SAMPLE = `You are helping write a {{format|blog post}} about {{topic}}.

Audience: {{audience|developers}}
Tone: {{tone|friendly, concise}}

Requirements:
{{requirements}}`;

const textareaCls =
  "w-full resize-y rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export default function PromptTemplateTool() {
  const { t } = useI18n();
  const [template, setTemplate] = useState(SAMPLE);
  const [system, setSystem] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedTemplate[]>(() => loadSaved());
  const [saveName, setSaveName] = useState("");

  const vars = useMemo(() => parseVariables(template), [template]);
  const segments = useMemo(() => renderSegments(template, values), [template, values]);
  const rendered = useMemo(() => segments.map((s) => s.text).join(""), [segments]);
  const unfilled = useMemo(
    () => [...new Set(segments.filter((s) => s.kind === "var" && !s.filled).map((s) => (s as { name: string }).name))],
    [segments]
  );

  const exports = useMemo(
    () => ({
      json: exportJson(template, values),
      openai: exportOpenAIMessages(system, rendered),
      anthropic: exportAnthropicMessages(system, rendered),
      js: exportJsTemplate(template),
    }),
    [template, values, system, rendered]
  );

  const save = () => {
    const name = saveName.trim() || template.trim().split("\n")[0].slice(0, 40) || "Untitled";
    const entry: SavedTemplate = { name, template, system, values, savedAt: Date.now() };
    const next = [entry, ...saved.filter((s) => s.name !== name)].slice(0, MAX_SAVED);
    if (persistSaved(next)) {
      setSaved(next);
      setSaveName("");
      toast.success(t("tool.prompt-template.saved"));
    } else {
      toast.error(t("tool.prompt-template.saveFailed"));
    }
  };

  const load = (s: SavedTemplate) => {
    setTemplate(s.template);
    setSystem(s.system ?? "");
    setValues(s.values ?? {});
    setSaveName(s.name);
  };

  const remove = (name: string) => {
    const next = saved.filter((s) => s.name !== name);
    persistSaved(next);
    setSaved(next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <FileText className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">Prompt Template</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {vars.length} {t("tool.prompt-template.variablesCount")}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-2">
        {/* Left: editing */}
        <div className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.prompt-template.system")}</span>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder={t("tool.prompt-template.systemPlaceholder")}
              rows={3}
              spellCheck={false}
              className={textareaCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.prompt-template.template")}</span>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={t("tool.prompt-template.templatePlaceholder")}
              rows={10}
              spellCheck={false}
              className={textareaCls}
            />
            <span className="text-[11px] text-[var(--muted-foreground)]">{t("tool.prompt-template.syntaxHint")}</span>
          </label>

          <div className="flex flex-col gap-3">
            <div className="text-xs font-medium">{t("tool.prompt-template.variables")}</div>
            {vars.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
                {t("tool.prompt-template.noVariables")}
              </div>
            ) : (
              vars.map((v) => (
                <label key={v.name} className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-xs">
                    <code className={cn("rounded px-1 font-mono", unfilled.includes(v.name) ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-[var(--muted)]")}>
                      {v.name}
                    </code>
                    {v.defaultValue !== undefined && (
                      <span className="truncate text-[var(--muted-foreground)]">
                        {t("tool.prompt-template.default")}: {v.defaultValue || "∅"}
                      </span>
                    )}
                  </span>
                  <textarea
                    value={values[v.name] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                    placeholder={v.defaultValue ?? ""}
                    rows={2}
                    spellCheck={false}
                    className={cn(textareaCls, "p-2")}
                  />
                </label>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
            <div className="text-xs font-medium">{t("tool.prompt-template.savedTitle")}</div>
            <div className="flex gap-2">
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={t("tool.prompt-template.saveName")} className="h-8" />
              <Button size="sm" onClick={save} disabled={!template.trim()}>
                <Save className="size-3.5" /> {t("tool.prompt-template.save")}
              </Button>
            </div>
            {saved.length === 0 ? (
              <div className="text-xs text-[var(--muted-foreground)]">{t("tool.prompt-template.noSaved")}</div>
            ) : (
              <ul className="flex flex-col gap-1">
                {saved.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-[var(--muted)]/40">
                    <span className="truncate">{s.name}</span>
                    <span className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => load(s)} title={t("tool.prompt-template.load")}>
                        <FolderOpen className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => remove(s.name)} title={t("tool.prompt-template.delete")}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: preview + export */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{t("tool.prompt-template.preview")}</span>
              <CopyButton text={rendered} label={t("tool.prompt-template.copy")} />
            </div>
            {unfilled.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                {t("tool.prompt-template.unfilled")}: {unfilled.join(", ")}
              </div>
            )}
            <pre className="min-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 font-mono text-sm">
              {segments.map((s, i) =>
                s.kind === "text" ? (
                  <span key={i}>{s.text}</span>
                ) : (
                  <mark
                    key={i}
                    title={s.name}
                    className={cn(
                      "rounded px-0.5",
                      s.filled ? "bg-[var(--primary)]/15 text-[var(--foreground)]" : "bg-amber-500/25 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {s.text}
                  </mark>
                )
              )}
            </pre>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium">{t("tool.prompt-template.export")}</span>
            <Tabs defaultValue="openai" className="mt-1.5">
              <TabsList>
                <TabsTrigger value="openai">OpenAI</TabsTrigger>
                <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="js">JS</TabsTrigger>
              </TabsList>
              {(Object.keys(exports) as (keyof typeof exports)[]).map((k) => (
                <TabsContent key={k} value={k}>
                  <div className="relative">
                    <CopyButton text={exports[k]} iconOnly className="absolute right-2 top-2" />
                    <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 pr-10 font-mono text-xs">
                      {exports[k]}
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
