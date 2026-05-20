import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pin,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
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
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("sidebar-collapsed", false);

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

  const collapsedTools = useMemo(() => {
    const out: Tool[] = [...pinnedTools];
    const seen = new Set(out.map((t) => t.id));
    for (const g of filtered) {
      for (const tool of g.tools) {
        if (!seen.has(tool.id)) {
          seen.add(tool.id);
          out.push(tool);
        }
      }
    }
    return out;
  }, [pinnedTools, filtered]);

  const editableTools = useMemo(() => orderedTools.filter((t) => matchTool(t, q)), [orderedTools, q]);

  const setCollapsedSafe = (next: boolean) => {
    if (next) setEditMode(false);
    setCollapsed(next);
  };

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

  const nav = (
    <nav className={cn("flex flex-col", collapsed && !editMode ? "gap-3 pb-2" : "gap-4 pb-3")}>
      {editMode ? (
        <div className="flex flex-col gap-1">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            {t("sidebar.arrange")}
          </div>
          {editableTools.map((toolItem) => (
            <ToolRow
              key={toolItem.id}
              tool={toolItem}
              pinned={pinned.includes(toolItem.id)}
              editMode
              draggable
              dragging={dragId === toolItem.id}
              onPin={() => togglePin(toolItem.id)}
              onDragStart={() => setDragId(toolItem.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOn(toolItem.id)}
            />
          ))}
        </div>
      ) : collapsed ? (
        <>
          {collapsedTools.length === 0 && (
            <p className="w-full px-1 py-6 text-center text-[10px] leading-tight text-[var(--muted-foreground)]">
              {t("sidebar.empty")}
            </p>
          )}
          {collapsedTools.map((toolItem) => (
            <ToolRow
              key={toolItem.id}
              tool={toolItem}
              pinned={pinned.includes(toolItem.id)}
              collapsed
              onPin={() => togglePin(toolItem.id)}
            />
          ))}
        </>
      ) : (
        <>
          {pinnedTools.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                {t("sidebar.pinned")}
              </div>
              {pinnedTools.map((toolItem) => (
                <ToolRow key={toolItem.id} tool={toolItem} pinned onPin={() => togglePin(toolItem.id)} />
              ))}
            </div>
          )}

          {filtered.length === 0 && pinnedTools.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-[var(--muted-foreground)]">{t("sidebar.empty")}</p>
          )}
          {filtered.map((g) => (
            <div key={g.category} className="flex flex-col gap-1">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                {categoryLabel(g.category)}
              </div>
              {g.tools.map((toolItem) => (
                <ToolRow key={toolItem.id} tool={toolItem} pinned={false} onPin={() => togglePin(toolItem.id)} />
              ))}
            </div>
          ))}
        </>
      )}
    </nav>
  );

  return (
    <aside
      className={cn(
        "hidden h-full min-h-0 shrink-0 flex-col p-3 md:flex",
        collapsed ? "w-14 gap-4 px-2 py-3" : "w-64 gap-3"
      )}
    >
      <NavLink
        to="/"
        className={cn(
          "flex items-center gap-2",
          collapsed ? "w-full justify-center px-0 py-0" : "px-2 py-1"
        )}
      >
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-400 via-fuchsia-500 to-indigo-500 text-white shadow">
          <Sparkles className="size-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">uni · tools</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">tools.hihi.team</span>
          </div>
        )}
      </NavLink>

      {!collapsed && (
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
              editMode
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "bg-[var(--input)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Settings2 className="size-3.5" />
          </button>
        </div>
      )}

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

      {collapsed ? (
        <div className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">{nav}</div>
      ) : (
        <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">{nav}</ScrollArea>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setCollapsedSafe(!collapsed)}
            aria-expanded={!collapsed}
            title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="grid h-8 w-full shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--input)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{collapsed ? t("sidebar.expand") : t("sidebar.collapse")}</TooltipContent>
      </Tooltip>
    </aside>
  );
}

function ToolRow({
  tool,
  pinned,
  editMode = false,
  collapsed = false,
  dragging = false,
  onPin,
  ...dragProps
}: {
  tool: Tool;
  pinned: boolean;
  editMode?: boolean;
  collapsed?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  onPin: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}) {
  const Icon = tool.icon;
  const { t } = useI18n();

  const link = (
    <NavLink
      to={`/tools/${tool.slug}`}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg text-sm transition-colors hover:bg-[var(--muted)]",
          collapsed
            ? "size-8 shrink-0 justify-center p-0"
            : "min-w-0 flex-1 basis-0 px-2 py-1.5",
          isActive ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{tool.name}</span>}
    </NavLink>
  );

  return (
    <div
      draggable={editMode}
      className={cn(
        "group flex items-center gap-1 rounded-lg",
        collapsed ? "w-full min-w-0 justify-center" : "min-w-0",
        dragging && "opacity-50"
      )}
      {...dragProps}
    >
      {editMode && !collapsed && (
        <GripVertical className="size-3.5 shrink-0 cursor-grab text-[var(--muted-foreground)]" />
      )}
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{tool.name}</TooltipContent>
        </Tooltip>
      ) : (
        link
      )}
      {!collapsed && (
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
      )}
    </div>
  );
}
