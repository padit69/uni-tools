/**
 * Infer TypeScript types (or Zod schemas) from a JSON sample.
 *
 * Object shapes are merged across array items: keys missing from some items
 * become optional, mixed value types become unions and `null` becomes `| null`.
 */

export interface GenerateOptions {
  rootName?: string;
  /** "interface" emits `interface X {}`, "type" emits `type X = {}` */
  declaration?: "interface" | "type";
  /** Emit Zod schemas instead of TypeScript declarations */
  zod?: boolean;
  /** Mark every field optional */
  allOptional?: boolean;
  /** Mark every field readonly (TS) / arrays readonly */
  readonly?: boolean;
  /** Prefix declarations with `export` (default true) */
  exported?: boolean;
}

type Prim = "string" | "number" | "boolean";
const PRIM_ORDER: Prim[] = ["string", "number", "boolean"];

interface Shape {
  prims: Set<Prim>;
  null: boolean;
  obj: ObjShape | null;
  /** Item shape for arrays (present once an array has been seen) */
  arr: Shape | null;
}

interface ObjShape {
  count: number;
  fields: Map<string, { shape: Shape; count: number }>;
}

const newShape = (): Shape => ({ prims: new Set(), null: false, obj: null, arr: null });

function merge(shape: Shape, value: unknown): void {
  if (value === null) {
    shape.null = true;
  } else if (Array.isArray(value)) {
    shape.arr ??= newShape();
    for (const item of value) merge(shape.arr, item);
  } else if (typeof value === "object") {
    shape.obj ??= { count: 0, fields: new Map() };
    const obj = shape.obj;
    obj.count++;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      let f = obj.fields.get(k);
      if (!f) {
        f = { shape: newShape(), count: 0 };
        obj.fields.set(k, f);
      }
      f.count++;
      merge(f.shape, v);
    }
  } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    shape.prims.add(typeof value as Prim);
  }
}

export function inferShape(value: unknown): Shape {
  const s = newShape();
  merge(s, value);
  return s;
}

/* ---------- naming helpers ---------- */

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function propertyKey(key: string): string {
  return IDENT_RE.test(key) ? key : JSON.stringify(key);
}

export function toPascalCase(input: string): string {
  const words = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  let name = words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  if (!name) return "";
  if (/^[0-9]/.test(name)) name = "T" + name;
  return name;
}

export function singularize(word: string): string {
  if (/ies$/i.test(word) && word.length > 4) return word.slice(0, -3) + (word.endsWith("IES") ? "Y" : "y");
  if (/(ss|us|is)$/i.test(word)) return word;
  if (/(ses|xes|zes|ches|shes)$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word) && word.length > 1) return word.slice(0, -1);
  return word;
}

/* ---------- emitter ---------- */

class Emitter {
  private used = new Set<string>();
  private names = new Map<ObjShape, string>();
  /** declarations keyed by object shape, kept in emission order */
  decls: string[] = [];

  constructor(private opts: Required<GenerateOptions>) {}

  uniqueName(base: string): string {
    let name = base || "Type";
    let i = 2;
    while (this.used.has(name)) name = `${base}${i++}`;
    this.used.add(name);
    return name;
  }

  reserve(name: string) {
    this.used.add(name);
  }

  private get exp() {
    return this.opts.exported ? "export " : "";
  }

  /* ---- TypeScript ---- */

  tsExpr(shape: Shape, hint: string): string {
    const parts = this.tsParts(shape, hint);
    return parts.length ? parts.join(" | ") : "unknown";
  }

  private tsParts(shape: Shape, hint: string): string[] {
    const parts: string[] = [];
    if (shape.obj) parts.push(this.tsObject(shape.obj, hint));
    if (shape.arr) {
      const itemHint = itemName(hint);
      const itemParts = this.tsParts(shape.arr, itemHint);
      const item = itemParts.length === 0 ? "unknown" : itemParts.join(" | ");
      const wrapped = itemParts.length > 1 ? `(${item})` : item;
      parts.push(this.opts.readonly ? `readonly ${wrapped}[]` : `${wrapped}[]`);
    }
    for (const p of PRIM_ORDER) if (shape.prims.has(p)) parts.push(p);
    if (shape.null) parts.push("null");
    return parts;
  }

  tsObject(obj: ObjShape, hint: string, fixedName?: string): string {
    const existing = this.names.get(obj);
    if (existing) return existing;
    const name = fixedName ?? this.uniqueName(toPascalCase(hint) || "Type");
    this.names.set(obj, name);
    const slot = this.decls.length;
    this.decls.push("");
    const lines: string[] = [];
    for (const [key, f] of obj.fields) {
      const optional = this.opts.allOptional || f.count < obj.count;
      const ro = this.opts.readonly ? "readonly " : "";
      lines.push(`  ${ro}${propertyKey(key)}${optional ? "?" : ""}: ${this.tsExpr(f.shape, key)};`);
    }
    const body = `{\n${lines.join("\n")}\n}`;
    this.decls[slot] = !lines.length
      ? `${this.exp}type ${name} = Record<string, unknown>;`
      : this.opts.declaration === "interface"
        ? `${this.exp}interface ${name} ${body}`
        : `${this.exp}type ${name} = ${body};`;
    return name;
  }

  /* ---- Zod ---- */

  zodExpr(shape: Shape, hint: string): string {
    const parts: string[] = [];
    if (shape.obj) parts.push(this.zodObject(shape.obj, hint));
    if (shape.arr) parts.push(`z.array(${this.zodExpr(shape.arr, itemName(hint))})`);
    for (const p of PRIM_ORDER) if (shape.prims.has(p)) parts.push(`z.${p}()`);
    if (parts.length === 0) return shape.null ? "z.null()" : "z.unknown()";
    const base = parts.length === 1 ? parts[0] : `z.union([${parts.join(", ")}])`;
    return shape.null ? `${base}.nullable()` : base;
  }

  zodObject(obj: ObjShape, hint: string, fixedName?: string): string {
    const existing = this.names.get(obj);
    if (existing) return `${existing}Schema`;
    const name = fixedName ?? this.uniqueName(toPascalCase(hint) || "Type");
    this.names.set(obj, name);
    const lines: string[] = [];
    for (const [key, f] of obj.fields) {
      const optional = this.opts.allOptional || f.count < obj.count;
      lines.push(`  ${propertyKey(key)}: ${this.zodExpr(f.shape, key)}${optional ? ".optional()" : ""},`);
    }
    const body = lines.length ? `z.object({\n${lines.join("\n")}\n})` : "z.object({})";
    // children were pushed first => post-order, valid for `const` definitions
    this.decls.push(
      `${this.exp}const ${name}Schema = ${body};\n${this.exp}type ${name} = z.infer<typeof ${name}Schema>;`
    );
    return `${name}Schema`;
  }
}

function itemName(hint: string): string {
  const pas = toPascalCase(hint);
  const single = singularize(pas);
  return single && single !== pas ? single : `${pas || "Root"}Item`;
}

export function generate(value: unknown, options: GenerateOptions = {}): string {
  const opts: Required<GenerateOptions> = {
    rootName: "Root",
    declaration: "interface",
    zod: false,
    allOptional: false,
    readonly: false,
    exported: true,
    ...options,
  };
  const rootName = toPascalCase(opts.rootName) || "Root";
  const shape = inferShape(value);
  const em = new Emitter(opts);
  const exp = opts.exported ? "export " : "";
  const isPlainObject =
    shape.obj && !shape.arr && shape.prims.size === 0 && !shape.null;

  if (opts.zod) {
    em.reserve(rootName);
    if (isPlainObject) {
      em.zodObject(shape.obj!, rootName, rootName);
    } else {
      const expr = em.zodExpr(shape, rootName);
      em.decls.push(
        `${exp}const ${rootName}Schema = ${expr};\n${exp}type ${rootName} = z.infer<typeof ${rootName}Schema>;`
      );
    }
    return `import { z } from "zod";\n\n${em.decls.join("\n\n")}\n`;
  }

  em.reserve(rootName);
  if (isPlainObject) {
    em.tsObject(shape.obj!, rootName, rootName);
    return em.decls.join("\n\n") + "\n";
  }
  const slot = em.decls.length;
  em.decls.push("");
  em.decls[slot] = `${exp}type ${rootName} = ${em.tsExpr(shape, rootName)};`;
  return em.decls.join("\n\n") + "\n";
}

export function generateFromJson(text: string, options: GenerateOptions = {}): string {
  return generate(JSON.parse(text), options);
}
