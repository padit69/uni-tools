export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
}

export const TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidToolName(name: string): boolean {
  return TOOL_NAME_RE.test(name);
}

/** Infer a JSON Schema from a sample value. Every key present becomes required. */
export function inferSchema(value: unknown): JsonSchema {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: {} };
    return { type: "array", items: value.map(inferSchema).reduce(mergeSchemas) };
  }
  switch (typeof value) {
    case "boolean":
      return { type: "boolean" };
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "string":
      return { type: "string" };
    case "object": {
      const obj = value as Record<string, unknown>;
      const properties: Record<string, JsonSchema> = {};
      for (const [k, v] of Object.entries(obj)) properties[k] = inferSchema(v);
      return { type: "object", properties, required: Object.keys(obj) };
    }
    default:
      return {};
  }
}

const same = (a: JsonSchema, b: JsonSchema) => JSON.stringify(a) === JSON.stringify(b);

/** Merge two schemas seen at the same position (e.g. array items). */
export function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (same(a, b)) return a;
  if (a.anyOf || b.anyOf) {
    const list = [...(a.anyOf ?? [a])];
    for (const s of b.anyOf ?? [b]) addVariant(list, s);
    return list.length === 1 ? list[0] : { anyOf: list };
  }
  if ((a.type === "integer" && b.type === "number") || (a.type === "number" && b.type === "integer")) {
    return { type: "number" };
  }
  if (a.type === "object" && b.type === "object") {
    const properties: Record<string, JsonSchema> = { ...a.properties };
    for (const [k, v] of Object.entries(b.properties ?? {})) {
      properties[k] = properties[k] ? mergeSchemas(properties[k], v) : v;
    }
    const reqB = new Set(b.required ?? []);
    return { type: "object", properties, required: (a.required ?? []).filter((k) => reqB.has(k)) };
  }
  if (a.type === "array" && b.type === "array") {
    const ai = a.items ?? {};
    const bi = b.items ?? {};
    if (Object.keys(ai).length === 0) return { type: "array", items: bi };
    if (Object.keys(bi).length === 0) return { type: "array", items: ai };
    return { type: "array", items: mergeSchemas(ai, bi) };
  }
  return { anyOf: [a, b] };
}

function addVariant(list: JsonSchema[], s: JsonSchema) {
  const numeric = (t?: string) => t === "integer" || t === "number";
  const i = list.findIndex(
    (x) => x.type !== undefined && (x.type === s.type || (numeric(x.type) && numeric(s.type)))
  );
  if (i >= 0) list[i] = mergeSchemas(list[i], s);
  else list.push(s);
}

export interface FieldOptions {
  /** Top-level field → required? (defaults to true for keys present) */
  required?: Record<string, boolean>;
  /** Top-level field → description */
  descriptions?: Record<string, string>;
}

export type BuildResult = { ok: true; schema: JsonSchema } | { ok: false; error: "parse" | "notObject"; message?: string };

/** Parse the sample args text and build the `parameters` schema (must be an object). */
export function buildParameters(sampleText: string, opts: FieldOptions = {}): BuildResult {
  let data: unknown;
  try {
    data = JSON.parse(sampleText);
  } catch (e) {
    return { ok: false, error: "parse", message: (e as Error).message };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "notObject" };
  return { ok: true, schema: applyFieldOptions(inferSchema(data), opts) };
}

export function applyFieldOptions(schema: JsonSchema, opts: FieldOptions): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  for (const [k, v] of Object.entries(schema.properties ?? {})) {
    const desc = opts.descriptions?.[k]?.trim();
    properties[k] = desc ? { ...v, description: desc } : v;
  }
  const required = Object.keys(properties).filter((k) => opts.required?.[k] ?? true);
  return { type: "object", properties, required };
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export function toOpenAI(t: ToolDef) {
  return { type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } };
}

export function toAnthropic(t: ToolDef) {
  return { name: t.name, description: t.description, input_schema: t.parameters };
}

export function toGemini(t: ToolDef) {
  return { name: t.name, description: t.description, parameters: t.parameters };
}
