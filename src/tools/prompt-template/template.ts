/** `{{name}}` or `{{name|default value}}` — names: letters, digits, _, ., - (must not start with a digit/dot/dash). */
const VAR_RE = /\{\{\s*([A-Za-z_][\w.-]*)\s*(?:\|([^}]*))?\}\}/g;

export interface TemplateVar {
  name: string;
  /** Default from the first occurrence that declares one. */
  defaultValue?: string;
}

export function parseVariables(template: string): TemplateVar[] {
  const map = new Map<string, TemplateVar>();
  for (const m of template.matchAll(VAR_RE)) {
    const name = m[1];
    const def = m[2];
    const existing = map.get(name);
    if (!existing) map.set(name, def !== undefined ? { name, defaultValue: def } : { name });
    else if (existing.defaultValue === undefined && def !== undefined) existing.defaultValue = def;
  }
  return [...map.values()];
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "var"; name: string; text: string; filled: boolean };

/** Split the template into literal text and resolved variables (for highlighting). */
export function renderSegments(template: string, values: Record<string, string>): Segment[] {
  const defaults = new Map(parseVariables(template).map((v) => [v.name, v.defaultValue]));
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(VAR_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", text: template.slice(last, idx) });
    const name = m[1];
    const value = values[name];
    const def = m[2] ?? defaults.get(name);
    if (value !== undefined && value !== "") out.push({ kind: "var", name, text: value, filled: true });
    else if (def !== undefined) out.push({ kind: "var", name, text: def, filled: true });
    else out.push({ kind: "var", name, text: m[0], filled: false });
    last = idx + m[0].length;
  }
  if (last < template.length) out.push({ kind: "text", text: template.slice(last) });
  return out;
}

export function renderTemplate(template: string, values: Record<string, string>): string {
  return renderSegments(template, values)
    .map((s) => s.text)
    .join("");
}

export function unfilledVariables(template: string, values: Record<string, string>): string[] {
  const set = new Set<string>();
  for (const s of renderSegments(template, values)) if (s.kind === "var" && !s.filled) set.add(s.name);
  return [...set];
}

/* ---------- Exports ---------- */

export function exportJson(template: string, values: Record<string, string>): string {
  const variables: Record<string, string> = {};
  for (const v of parseVariables(template)) variables[v.name] = values[v.name] ?? v.defaultValue ?? "";
  return JSON.stringify({ template, variables }, null, 2);
}

export function exportOpenAIMessages(system: string, rendered: string): string {
  const messages: { role: string; content: string }[] = [];
  if (system.trim()) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: rendered });
  return JSON.stringify({ messages }, null, 2);
}

export function exportAnthropicMessages(system: string, rendered: string): string {
  const body: { system?: string; messages: { role: string; content: string }[] } = {
    messages: [{ role: "user", content: rendered }],
  };
  if (system.trim()) return JSON.stringify({ system, ...body }, null, 2);
  return JSON.stringify(body, null, 2);
}

export function toIdentifier(name: string): string {
  let id = name.replace(/[^A-Za-z0-9_$]/g, "_");
  if (/^[0-9]/.test(id)) id = "_" + id;
  return id || "_";
}

const escapeLiteral = (s: string) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

/** `export const buildPrompt = ({ a, b = "x" }) => \`...${a}...\`;` */
export function exportJsTemplate(template: string, fnName = "buildPrompt"): string {
  const vars = parseVariables(template);
  const params = vars
    .map((v) => {
      const id = toIdentifier(v.name);
      const key = id === v.name ? id : `${JSON.stringify(v.name)}: ${id}`;
      return v.defaultValue !== undefined ? `${key} = ${JSON.stringify(v.defaultValue)}` : key;
    })
    .join(", ");
  let body = "";
  let last = 0;
  for (const m of template.matchAll(VAR_RE)) {
    const idx = m.index ?? 0;
    body += escapeLiteral(template.slice(last, idx)) + "${" + toIdentifier(m[1]) + "}";
    last = idx + m[0].length;
  }
  body += escapeLiteral(template.slice(last));
  const arg = vars.length ? `{ ${params} }` : "";
  return `export const ${fnName} = (${arg}) => \`${body}\`;\n`;
}

/* ---------- Saved templates (localStorage) ---------- */

export interface SavedTemplate {
  name: string;
  template: string;
  system: string;
  values: Record<string, string>;
  savedAt: number;
}

export const STORAGE_KEY = "uni-tools:prompt-template:saved";
export const MAX_SAVED = 20;

export function loadSaved(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((x) => x && typeof x.name === "string" && typeof x.template === "string") : [];
  } catch {
    return [];
  }
}

export function persistSaved(list: SavedTemplate[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
    return true;
  } catch {
    return false;
  }
}
