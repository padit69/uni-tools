/** Workspace (tab) list for Mini Draw. Each workspace keeps its own scene in localStorage. */

export interface Workspace {
  id: string;
  name: string;
}

export interface WorkspaceState {
  list: Workspace[];
  activeId: string;
}

export const LEGACY_SCENE_KEY = "uni-tools:mini-draw:scene";
export const WORKSPACES_KEY = "uni-tools:mini-draw:workspaces";
const SCENE_PREFIX = "uni-tools:mini-draw:ws:";

export const sceneKey = (id: string) => `${SCENE_PREFIX}${id}:scene`;
export const viewKey = (id: string) => `${SCENE_PREFIX}${id}:view`;

export function newWorkspaceId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** "Board N" with the smallest N not already used by a default-named workspace. */
export function nextName(list: Workspace[], base: string): string {
  const used = new Set(list.map((w) => w.name));
  let n = list.length + 1;
  for (let i = 1; i <= list.length + 1; i++) {
    if (!used.has(`${base} ${i}`)) {
      n = i;
      break;
    }
  }
  return `${base} ${n}`;
}

export function parseState(raw: string | null): WorkspaceState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<WorkspaceState>;
    if (!Array.isArray(v.list)) return null;
    const list = v.list
      .filter((w): w is Workspace => !!w && typeof w.id === "string" && !!w.id && typeof w.name === "string")
      .map((w) => ({ id: w.id, name: w.name.slice(0, 60) || "Board" }));
    const seen = new Set<string>();
    const unique = list.filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
    if (!unique.length) return null;
    const activeId = unique.some((w) => w.id === v.activeId) ? (v.activeId as string) : unique[0].id;
    return { list: unique, activeId };
  } catch {
    return null;
  }
}

export function addWorkspace(s: WorkspaceState, base: string, id = newWorkspaceId()): WorkspaceState {
  const ws = { id, name: nextName(s.list, base) };
  return { list: [...s.list, ws], activeId: id };
}

export function renameWorkspace(s: WorkspaceState, id: string, name: string): WorkspaceState {
  const clean = name.trim().slice(0, 60);
  if (!clean) return s;
  return { ...s, list: s.list.map((w) => (w.id === id ? { ...w, name: clean } : w)) };
}

/** Remove a workspace; activates the neighbour. Never leaves the list empty (caller adds a fresh one). */
export function removeWorkspace(s: WorkspaceState, id: string): WorkspaceState {
  const idx = s.list.findIndex((w) => w.id === id);
  if (idx === -1) return s;
  const list = s.list.filter((w) => w.id !== id);
  if (!list.length) return s;
  const activeId = s.activeId === id ? list[Math.min(idx, list.length - 1)].id : s.activeId;
  return { list, activeId };
}

export function duplicateWorkspace(s: WorkspaceState, id: string, suffix: string, newId = newWorkspaceId()): WorkspaceState {
  const idx = s.list.findIndex((w) => w.id === id);
  if (idx === -1) return s;
  const copy = { id: newId, name: `${s.list[idx].name} ${suffix}`.slice(0, 60) };
  const list = [...s.list.slice(0, idx + 1), copy, ...s.list.slice(idx + 1)];
  return { list, activeId: newId };
}

export function moveWorkspace(s: WorkspaceState, from: number, to: number): WorkspaceState {
  if (from === to || from < 0 || to < 0 || from >= s.list.length || to >= s.list.length) return s;
  const list = [...s.list];
  const [w] = list.splice(from, 1);
  list.splice(to, 0, w);
  return { ...s, list };
}
