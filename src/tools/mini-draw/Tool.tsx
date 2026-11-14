import { useEffect, useRef, useState } from "react";
import { Copy, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import { Board } from "./Board";
import { parseScene, serializeScene } from "./model";
import { useFileDrop } from "@/lib/fileDrop";
import { toast } from "sonner";
import {
  LEGACY_SCENE_KEY,
  WORKSPACES_KEY,
  addWorkspace,
  duplicateWorkspace,
  moveWorkspace,
  newWorkspaceId,
  parseState,
  removeWorkspace,
  renameWorkspace,
  sceneKey,
  viewKey,
  type WorkspaceState,
} from "./workspaces";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or full */
  }
}
function storageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Load workspace list; on first run migrate the old single-scene autosave into "Board 1". */
function initState(base: string): WorkspaceState {
  const saved = parseState(storageGet(WORKSPACES_KEY));
  if (saved) return saved;
  const id = newWorkspaceId();
  const legacy = storageGet(LEGACY_SCENE_KEY);
  if (legacy) {
    storageSet(sceneKey(id), legacy);
    storageRemove(LEGACY_SCENE_KEY);
  }
  return { list: [{ id, name: `${base} 1` }], activeId: id };
}

function hasContent(id: string): boolean {
  const raw = storageGet(sceneKey(id));
  if (!raw) return false;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v?.elements) ? v.elements.length > 0 : true;
  } catch {
    return true;
  }
}

export default function MiniDrawTool() {
  const { t } = useI18n();
  const base = t("tool.mini-draw.ws.default");
  const [state, setState] = useState<WorkspaceState>(() => initState(base));
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Persist the list and purge storage of removed workspaces. Runs after the removed
  // Board's unmount flush, so its scene doesn't get written back.
  const knownIds = useRef<string[]>(state.list.map((w) => w.id));
  useEffect(() => {
    storageSet(WORKSPACES_KEY, JSON.stringify(state));
    const ids = state.list.map((w) => w.id);
    for (const old of knownIds.current) {
      if (!ids.includes(old)) {
        storageRemove(sceneKey(old));
        storageRemove(viewKey(old));
      }
    }
    knownIds.current = ids;
  }, [state]);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [state.activeId]);

  const active = state.list.find((w) => w.id === state.activeId) ?? state.list[0];

  const add = () => setState((s) => addWorkspace(s, base));

  // Dropping a scene file anywhere opens it in a new workspace tab.
  useFileDrop("mini-draw", (f) => {
    try {
      const els = parseScene(f.text);
      const id = newWorkspaceId();
      storageSet(sceneKey(id), serializeScene(els));
      const name = f.fileName.replace(/\.json$/i, "").slice(0, 60) || base;
      setState((s) => ({ list: [...s.list, { id, name }], activeId: id }));
    } catch {
      toast.error(t("tool.mini-draw.importFailed"));
    }
  });

  const startRename = (id: string, name: string) => {
    setRenaming(id);
    setDraftName(name);
  };
  const commitRename = () => {
    if (renaming) setState((s) => renameWorkspace(s, renaming, draftName));
    setRenaming(null);
  };

  const duplicate = (id: string) => {
    const newId = newWorkspaceId();
    const scene = storageGet(sceneKey(id));
    const view = storageGet(viewKey(id));
    if (scene) storageSet(sceneKey(newId), scene);
    if (view) storageSet(viewKey(newId), view);
    setState((s) => duplicateWorkspace(s, id, t("tool.mini-draw.ws.copySuffix"), newId));
  };

  const requestDelete = (id: string) => {
    if (hasContent(id)) setConfirmDelete(id);
    else doDelete(id);
  };
  const doDelete = (id: string) => {
    setState((s) => {
      if (s.list.length > 1) return removeWorkspace(s, id);
      const fresh = newWorkspaceId();
      return { list: [{ id: fresh, name: `${base} 1` }], activeId: fresh };
    });
    setConfirmDelete(null);
  };

  const deleting = state.list.find((w) => w.id === confirmDelete);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label={t("tool.mini-draw.ws.label")}
        className="flex shrink-0 items-end gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--muted)]/20 px-2 pt-1.5"
      >
        {state.list.map((w, i) => {
          const isActive = w.id === active.id;
          return (
            <div
              key={w.id}
              ref={isActive ? activeTabRef : undefined}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              draggable={renaming !== w.id}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) setState((s) => moveWorkspace(s, dragIndex, i));
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              onClick={() => setState((s) => ({ ...s, activeId: w.id }))}
              onDoubleClick={() => startRename(w.id, w.name)}
              onKeyDown={(e) => {
                if (e.key === "F2") startRename(w.id, w.name);
              }}
              className={cn(
                "group flex h-8 max-w-48 shrink-0 cursor-pointer items-center gap-1 rounded-t-md border border-b-0 px-2.5 text-xs transition-colors",
                isActive
                  ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]",
                dragIndex === i && "opacity-50"
              )}
              title={t("tool.mini-draw.ws.hint")}
            >
              {renaming === w.id ? (
                <input
                  autoFocus
                  value={draftName}
                  maxLength={60}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-32 rounded border border-[var(--border)] bg-[var(--muted)]/40 px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                />
              ) : (
                <span className="truncate">{w.name}</span>
              )}
              {isActive && renaming !== w.id && (
                <>
                  <TabIconButton label={t("tool.mini-draw.ws.rename")} onClick={() => startRename(w.id, w.name)}>
                    <Pencil className="size-3" />
                  </TabIconButton>
                  <TabIconButton label={t("tool.mini-draw.ws.duplicate")} onClick={() => duplicate(w.id)}>
                    <Copy className="size-3" />
                  </TabIconButton>
                </>
              )}
              <TabIconButton
                label={t("tool.mini-draw.ws.close")}
                onClick={() => requestDelete(w.id)}
                className={cn(!isActive && "opacity-0 group-hover:opacity-100")}
              >
                <X className="size-3" />
              </TabIconButton>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="mb-0.5 size-7 shrink-0"
          onClick={add}
          title={t("tool.mini-draw.ws.new")}
          aria-label={t("tool.mini-draw.ws.new")}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <Board key={active.id} storageKey={sceneKey(active.id)} viewStorageKey={viewKey(active.id)} name={active.name} />
      </div>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm p-5">
          <DialogTitle className="text-base font-semibold">
            {t("tool.mini-draw.ws.deleteTitle").replace("{name}", deleting?.name ?? "")}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            {t("tool.mini-draw.ws.deleteDesc")}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              {t("tool.mini-draw.cancel")}
            </Button>
            <Button size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={() => deleting && doDelete(deleting.id)}>
              {t("tool.mini-draw.ws.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
        className
      )}
    >
      {children}
    </button>
  );
}
