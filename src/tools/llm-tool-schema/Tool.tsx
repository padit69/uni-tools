import { useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CopyButton } from "@/components/tool/CopyButton";
import { JsonEditor } from "@/tools/json/JsonEditor";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { buildParameters, isValidToolName, toAnthropic, toGemini, toOpenAI, type JsonSchema } from "./schema";

const SAMPLE = `{
  "location": "Hanoi, Vietnam",
  "unit": "celsius",
  "days": 3,
  "include_hourly": false,
  "fields": ["temp", "humidity"]
}`;

const typeLabel = (s: JsonSchema): string => {
  if (s.anyOf) return s.anyOf.map(typeLabel).join(" | ");
  if (s.type === "array") return `${s.items ? typeLabel(s.items) || "any" : "any"}[]`;
  return s.type ?? "any";
};

export default function LlmToolSchemaTool() {
  const { t } = useI18n();
  const [name, setName] = useState("get_weather");
  const [description, setDescription] = useState("Get the weather forecast for a location.");
  const [sample, setSample] = useState(SAMPLE);
  const [required, setRequired] = useState<Record<string, boolean>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  const nameValid = isValidToolName(name);
  const result = useMemo(() => buildParameters(sample, { required, descriptions }), [sample, required, descriptions]);
  const fields = result.ok ? Object.entries(result.schema.properties ?? {}) : [];

  const outputs = useMemo(() => {
    if (!result.ok) return null;
    const def = { name, description, parameters: result.schema };
    const s = (v: unknown) => JSON.stringify(v, null, 2);
    return {
      schema: s(result.schema),
      openai: s(toOpenAI(def)),
      anthropic: s(toAnthropic(def)),
      gemini: s(toGemini(def)),
    };
  }, [result, name, description]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm">
        <Wrench className="size-4 text-[var(--muted-foreground)]" />
        <span className="font-medium">LLM Tool Schema</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.llm-tool-schema.name")}</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn("font-mono", !nameValid && "border-red-500/60 focus-visible:ring-red-500/40")}
              spellCheck={false}
            />
            {!nameValid && <span className="text-xs text-red-500">{t("tool.llm-tool-schema.nameInvalid")}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.llm-tool-schema.description")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-transparent p-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{t("tool.llm-tool-schema.sample")}</span>
            <div className="h-64 overflow-hidden rounded-lg border border-[var(--border)]">
              <JsonEditor value={sample} onChange={setSample} lang="json" withLinter height="100%" style={{ height: "100%" }} />
            </div>
            {!result.ok && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-500">
                {result.error === "parse"
                  ? `${t("tool.llm-tool-schema.parseError")}: ${result.message ?? ""}`
                  : t("tool.llm-tool-schema.notObject")}
              </div>
            )}
          </div>

          {fields.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">{t("tool.llm-tool-schema.fields")}</span>
              <div className="flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {fields.map(([key, s]) => (
                  <div key={key} className="flex flex-col gap-1.5 p-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-2 sm:w-48 sm:shrink-0">
                      <code className="truncate font-mono text-xs">{key}</code>
                      <span className="shrink-0 rounded bg-[var(--muted)] px-1 text-[10px] text-[var(--muted-foreground)]">{typeLabel(s)}</span>
                    </div>
                    <Input
                      value={descriptions[key] ?? ""}
                      onChange={(e) => setDescriptions((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={t("tool.llm-tool-schema.fieldDescription")}
                      className="h-8 text-xs"
                    />
                    <label className="flex shrink-0 items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={required[key] ?? true}
                        onChange={(e) => setRequired((p) => ({ ...p, [key]: e.target.checked }))}
                        className="size-3 accent-[var(--primary)]"
                      />
                      {t("tool.llm-tool-schema.required")}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium">{t("tool.llm-tool-schema.output")}</span>
          {outputs ? (
            <Tabs defaultValue="openai" className="mt-1.5">
              <TabsList>
                <TabsTrigger value="schema">JSON Schema</TabsTrigger>
                <TabsTrigger value="openai">OpenAI</TabsTrigger>
                <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
                <TabsTrigger value="gemini">Gemini</TabsTrigger>
              </TabsList>
              {!nameValid && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-600 dark:text-amber-400">
                  {t("tool.llm-tool-schema.nameInvalid")}
                </div>
              )}
              {(Object.keys(outputs) as (keyof typeof outputs)[]).map((k) => (
                <TabsContent key={k} value={k}>
                  <div className="relative">
                    <CopyButton text={outputs[k]} iconOnly className="absolute right-2 top-2" />
                    <pre className="max-h-[70vh] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 pr-10 font-mono text-xs">
                      {outputs[k]}
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="mt-1.5 rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
              {t("tool.llm-tool-schema.empty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
