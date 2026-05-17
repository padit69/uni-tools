import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { GripVertical, Pin, RotateCcw, Search, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { groupToolsByCategory } from "@/tools/registry";
import type { Tool } from "@/tools/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n";

function matchTool(t: Tool, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    t.name.toLowerCase().includes(needle) ||
    t.description.toLowerCase().includes(needle) ||
    t.keywords.some((k) => k.toLowerCase().includes(needle))
  );
}

function move<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function Sidebar() {
  const { t, categoryLabel } = useI18n();
  const [q, setQ] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pinned, setPinned] = useLocalStorage<string[]>("sidebar-pinned-tools", []);
  const [order, setOrder] = useLocalStorage<string[]>("sidebar-tool-order", []);

  const groups = useMemo(() => groupToolsByCategory(), []);
  const allTools = useMemo(() => groups.flatMap((g) => g.tools), [groups]);
  const toolMap = useMemo(() => new Map(allTools.map((t) => [t.id, t])), [allTools]);

  const orderedTools = useMemo(() => {
    const known = order.map((id) => toolMap.get(id)).filter(Boolean) as Tool[];
    const missing = allTools.filter((t) => !order.includes(t.id));
    return [...known, ...missing];
  }, [allTools, order, toolMap]);

  const pinnedTools = useMemo(
    () => pinned.map((id) => toolMap.get(id)).filter((t): t is Tool => !!t).filter((t) => matchTool(t, q)),
    [pinned, q, toolMap]
  );

  const filtered = useMemo(() => {
    if (editMode) return [];
    return groups
      .map((g) => ({
        ...g,
        tools: g.tools.filter((t) => !pinned.includes(t.id) && matchTool(t, q)),
      }))
      .filter((g) => g.tools.length > 0);
  }, [editMode, groups, pinned, q]);

  const editableTools = useMemo(() => orderedTools.filter((t) => matchTool(t, q)), [orderedTools, q]);

  const togglePin = (id: string) => {
    setPinned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = orderedTools.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from >= 0 && to >= 0) setOrder(move(ids, from, to));
    setDragId(null);
  };

  const resetLayout = () => {
    setPinned([]);
    setOrder([]);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-3 p-3">
      <NavLink to="/" className="flex items-center gap-2 px-2 py-1">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-orange-400 via-fuchsia-500 to-indigo-500 text-white shadow">
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">uni · tools</span>
          <span className="text-[10px] text-[var(--muted-foreground)]">tools.hihi.team</span>
        </div>
      </NavLink>

      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          title={t("sidebar.customizeTitle")}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] transition",
            editMode ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--input)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          <Settings2 className="size-3.5" />
        </button>
      </div>

      {editMode && (
        <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 p-2 text-[11px] text-[var(--muted-foreground)]">
          <div className="flex items-center justify-between gap-2">
            <span>{t("sidebar.customizeHint")}</span>
            <button onClick={resetLayout} title={t("sidebar.reset")} className="rounded p-1 hover:bg-white/10">
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <ScrollArea className="-mx-1 flex-1 px-1">
        <nav className="flex flex-col gap-4 pb-3">
          {editMode ? (
            <div className="flex flex-col gap-1">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                {t("sidebar.arrange")}
              </div>
              {editableTools.map((t) => (
                <ToolRow
                  key={t.id}
                  tool={t}
                  pinned={pinned.includes(t.id)}
                  editMode
                  draggable
                  dragging={dragId === t.id}
                  onPin={() => togglePin(t.id)}
                  onDragStart={() => setDragId(t.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(t.id)}
                />
              ))}
            </div>
          ) : (
            <>
              {pinnedTools.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                    {t("sidebar.pinned")}
                  </div>
                  {pinnedTools.map((t) => (
                    <ToolRow key={t.id} tool={t} pinned onPin={() => togglePin(t.id)} />
                  ))}
                </div>
              )}

              {filtered.length === 0 && pinnedTools.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-[var(--muted-foreground)]">
                  {t("sidebar.empty")}
                </p>
              )}
              {filtered.map((g) => (
                <div key={g.category} className="flex flex-col gap-1">
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                    {categoryLabel(g.category)}
                  </div>
                  {g.tools.map((t) => (
                    <ToolRow key={t.id} tool={t} pinned={false} onPin={() => togglePin(t.id)} />
                  ))}
                </div>
              ))}
            </>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function ToolRow({
  tool,
  pinned,
  editMode = false,
  dragging = false,
  onPin,
  ...dragProps
}: {
  tool: Tool;
  pinned: boolean;
  editMode?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  onPin: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const Icon = tool.icon;
  const { t } = useI18n();
  return (
    <div
      draggable={editMode}
      className={cn("group flex min-w-0 items-center gap-1 rounded-lg", dragging && "opacity-50")}
      {...dragProps}
    >
      {editMode && <GripVertical className="size-3.5 shrink-0 cursor-grab text-[var(--muted-foreground)]" />}
      <NavLink
        to={`/tools/${tool.slug}`}
        className={({ isActive }) =>
          cn(
            "min-w-0 flex flex-1 basis-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
            "hover:bg-[var(--muted)]",
            isActive ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
          )
        }
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{tool.name}</span>
      </NavLink>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPin();
        }}
        title={pinned ? t("pin.unpin") : t("pin.pin")}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md transition hover:bg-[var(--muted)]",
          pinned ? "text-orange-400 opacity-100" : "text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100",
          editMode && "opacity-100"
        )}
      >
        <Pin className={cn("size-3", pinned && "fill-current")} />
      </button>
    </div>
  );
}
