import { ChevronRight, Copy } from "lucide-react";
import { useState, memo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface NodeProps {
  name: string | null; // null = root
  value: JsonValue;
  path: string;        // eg. $.user.address[0]
  depth: number;
  defaultOpen?: boolean;
}

function valueType(v: JsonValue): "string" | "number" | "boolean" | "null" | "array" | "object" {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v as "string" | "number" | "boolean" | "object";
}

const typeColors: Record<ReturnType<typeof valueType>, string> = {
  string: "text-emerald-400",
  number: "text-amber-400",
  boolean: "text-fuchsia-400",
  null: "text-zinc-400 italic",
  array: "text-sky-400",
  object: "text-sky-400",
};

function ValueLeaf({ value }: { value: JsonValue }) {
  const t = valueType(value);
  if (t === "string") return <span className={typeColors.string}>"{String(value)}"</span>;
  if (t === "null") return <span className={typeColors.null}>null</span>;
  return <span className={typeColors[t]}>{String(value)}</span>;
}

function copyPath(path: string) {
  navigator.clipboard.writeText(path).then(() => {
    toast.success("Đã copy path", { description: path, duration: 1500 });
  });
}

const Node = memo(function Node({ name, value, path, depth, defaultOpen = true }: NodeProps) {
  const t = valueType(value);
  const isContainer = t === "object" || t === "array";
  const [open, setOpen] = useState(depth < 2 ? defaultOpen : false);

  const entries: Array<[string, JsonValue, string]> = isContainer
    ? t === "array"
      ? (value as JsonValue[]).map((v, i) => [String(i), v, `${path}[${i}]`])
      : Object.entries(value as Record<string, JsonValue>).map(([k, v]) => [
          k,
          v,
          `${path}.${k}`,
        ])
    : [];

  const count = entries.length;

  return (
    <div className="font-mono text-[12.5px] leading-relaxed">
      <div
        className={cn(
          "group flex items-start gap-1 rounded px-1 py-0.5 hover:bg-white/5",
          isContainer && "cursor-pointer"
        )}
        onClick={() => isContainer && setOpen((o) => !o)}
      >
        {isContainer ? (
          <ChevronRight
            className={cn(
              "mt-1 size-3 shrink-0 text-[var(--muted-foreground)] transition-transform",
              open && "rotate-90"
            )}
          />
        ) : (
          <span className="inline-block w-3 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          {name !== null && (
            <>
              <span className="text-zinc-300">{t === "array" ? "" : `"${name}"`}</span>
              {t !== "array" && <span className="text-[var(--muted-foreground)]">: </span>}
            </>
          )}
          {isContainer ? (
            <span className={typeColors[t]}>
              {t === "array" ? `Array(${count})` : `Object {${count}}`}{" "}
              {!open && <span className="text-[var(--muted-foreground)]">…</span>}
            </span>
          ) : (
            <ValueLeaf value={value} />
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            copyPath(path);
          }}
          className="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100"
          title={`Copy path: ${path}`}
        >
          <Copy className="size-3" />
        </button>
      </div>

      {isContainer && open && count > 0 && (
        <div className="ml-3 border-l border-[var(--border)] pl-3">
          {entries.map(([k, v, p]) => (
            <Node key={p} name={k} value={v} path={p} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

interface TreeViewProps {
  data: JsonValue;
  rootPath?: string;
}

export function TreeView({ data, rootPath = "$" }: TreeViewProps) {
  return (
    <div className="h-full overflow-auto p-3">
      <Node name={null} value={data} path={rootPath} depth={0} />
    </div>
  );
}
