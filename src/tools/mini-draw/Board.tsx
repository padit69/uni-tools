import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Circle, Download, Eraser, FileCode, FileJson, Hand, ImageDown, Maximize, Minus, MousePointer2, MoveUpRight,
  PaintBucket, Pencil, Redo2, Square, Trash2, Type, Undo2, Upload, ZoomIn, ZoomOut, Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n";
import {
  FG, FONT_FAMILY, STROKE_WIDTHS, TEXT_LINE_HEIGHT, TEXT_SIZES, TEXT_CHAR_WIDTH, elementBounds, elementsInBox, hitTest,
  hitTopmost, isDegenerate, newId, normRect, parseScene, resizeBounds, scaleElement, sceneBounds, serializeScene,
  simplifyPoints, translateElement, unionBounds, type Bounds, type Corner, type DrawEl, type Pt, type SizeKey, type TextEl,
} from "./model";
import { canRedo, canUndo, createHistory, pushHistory, redo as redoH, undo as undoH, type History } from "./history";
import { elementShapes, liveResolver, sceneToSvg, type ShapeNode } from "./svg";
import { clampZoom, screenToWorld, worldToScreen, zoomAt, type Viewport } from "./viewport";

type Tool = "select" | "hand" | "pen" | "line" | "arrow" | "rect" | "ellipse" | "text" | "eraser";

const PALETTE = [FG, "#e5484d", "#f76b15", "#d4a017", "#30a46c", "#3e83f8", "#8e4ec6"];
const HIT_TOL = 6; // screen px

const TOOLS: { id: Tool; key: string; icon: typeof Pencil }[] = [
  { id: "select", key: "V", icon: MousePointer2 },
  { id: "hand", key: "H", icon: Hand },
  { id: "pen", key: "P", icon: Pencil },
  { id: "line", key: "L", icon: Minus },
  { id: "arrow", key: "A", icon: MoveUpRight },
  { id: "rect", key: "R", icon: Square },
  { id: "ellipse", key: "O", icon: Circle },
  { id: "text", key: "T", icon: Type },
  { id: "eraser", key: "E", icon: Eraser },
];
const KEY_TO_TOOL: Record<string, Tool> = Object.fromEntries(TOOLS.map((x) => [x.key.toLowerCase(), x.id]));

type Drag =
  | { kind: "pan"; sx: number; sy: number; view: Viewport }
  | { kind: "draw"; start: Pt }
  | { kind: "move"; start: Pt; orig: DrawEl[]; ids: Set<string>; moved: boolean }
  | { kind: "resize"; corner: Corner; startBounds: Bounds; orig: DrawEl[]; ids: Set<string> }
  | { kind: "marquee"; start: Pt; additive: boolean; base: string[] }
  | { kind: "erase"; ids: Set<string> };

interface Editing { id: string; x: number; y: number; text: string; size: number; stroke: string; isNew: boolean }

function loadScene(key: string): DrawEl[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parseScene(raw) : [];
  } catch {
    return [];
  }
}

function isEditableTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

/** Convert any CSS colour (incl. oklch) to an rgba()/hex string via a 1px canvas. */
function toSrgb(color: string, fallback: string): string {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx || !color) return fallback;
    ctx.fillStyle = fallback;
    ctx.fillStyle = color.trim();
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return a === 255 ? `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}` : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  } catch {
    return fallback;
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

function renderNode(n: ShapeNode, key?: number): ReactNode {
  const { style, ...attrs } = n.attrs;
  const Tag = n.tag;
  return (
    <Tag key={key} {...attrs} style={style ? { whiteSpace: "pre" } : undefined}>
      {n.text}
      {n.children?.map((c, i) => renderNode(c, i))}
    </Tag>
  );
}

const ElementView = memo(function ElementView({ el, faded }: { el: DrawEl; faded?: boolean }) {
  return <g opacity={faded ? 0.25 : undefined}>{renderNode(elementShapes(el, liveResolver))}</g>;
});

function loadView(key: string): Viewport {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    if (v && [v.x, v.y, v.zoom].every((n) => typeof n === "number" && Number.isFinite(n))) {
      return { x: v.x, y: v.y, zoom: clampZoom(v.zoom) };
    }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0, zoom: 1 };
}

function fileBase(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "mini-draw";
}

export interface BoardProps {
  /** localStorage key for the scene. */
  storageKey: string;
  /** localStorage key for the viewport (pan/zoom). */
  viewStorageKey?: string;
  /** Workspace name, used for export file names. */
  name?: string;
}

export function Board({ storageKey, viewStorageKey, name = "mini-draw" }: BoardProps) {
  const { t } = useI18n();
  const [hist, setHist] = useState<History<DrawEl[]>>(() => createHistory(loadScene(storageKey)));
  const elements = hist.present;
  const [live, setLiveState] = useState<DrawEl[] | null>(null);
  const liveRef = useRef<DrawEl[] | null>(null);
  const setLive = (l: DrawEl[] | null) => { liveRef.current = l; setLiveState(l); };
  const [draft, setDraftState] = useState<DrawEl | null>(null);
  const draftRef = useRef<DrawEl | null>(null);
  const setDraft = (d: DrawEl | null) => { draftRef.current = d; setDraftState(d); };
  const [selected, setSelected] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(FG);
  const [customColor, setCustomColor] = useState("#3e83f8");
  const [size, setSize] = useState<SizeKey>("m");
  const [fill, setFill] = useState(false);
  const [view, setView] = useState<Viewport>(() => (viewStorageKey ? loadView(viewStorageKey) : { x: 0, y: 0, zoom: 1 }));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [marquee, setMarquee] = useState<Bounds | null>(null);
  const [erasing, setErasing] = useState<Set<string>>(() => new Set());
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [transparentBg, setTransparentBg] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinchRef = useRef<{ dist: number; mid: Pt; view: Viewport } | null>(null);

  const shown = live ?? elements;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // latest values for event handlers registered once
  const st = useRef({ hist, view, selected, tool, editing, shown });
  st.current = { hist, view, selected, tool, editing, shown };

  /* -------------------------------------------------------------- history */
  const commit = useCallback((next: DrawEl[]) => setHist((h) => pushHistory(h, next)), []);
  const doUndo = useCallback(() => { setHist((h) => undoH(h)); setSelected([]); }, []);
  const doRedo = useCallback(() => { setHist((h) => redoH(h)); setSelected([]); }, []);

  /* ------------------------------------------------------------- autosave */
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (elements.length) localStorage.setItem(storageKey, serializeScene(elements));
        else localStorage.removeItem(storageKey);
      } catch {
        /* storage unavailable or full */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [elements, storageKey]);

  // Flush pending autosave immediately when the board unmounts (e.g. switching workspace tabs).
  const latest = useRef({ elements, view });
  latest.current = { elements, view };
  useEffect(() => () => {
    try {
      const els = latest.current.elements;
      if (els.length) localStorage.setItem(storageKey, serializeScene(els));
      else localStorage.removeItem(storageKey);
      if (viewStorageKey) localStorage.setItem(viewStorageKey, JSON.stringify(latest.current.view));
    } catch {
      /* ignore */
    }
  }, [storageKey, viewStorageKey]);

  useEffect(() => {
    if (!viewStorageKey) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(viewStorageKey, JSON.stringify(view));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [view, viewStorageKey]);

  /* ------------------------------------------------------------ helpers */
  const toLocal = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const [sx, sy] = toLocal(e);
    return screenToWorld(st.current.view, sx, sy);
  };

  const strokeWidth = STROKE_WIDTHS[size];

  const commitText = useCallback(() => {
    const ed = st.current.editing;
    if (!ed) return;
    setEditing(null);
    const els = st.current.hist.present;
    const text = ed.text.replace(/\s+$/, "");
    if (ed.isNew) {
      if (!text.trim()) return;
      const el: TextEl = { id: ed.id, type: "text", stroke: ed.stroke, width: 2, x: ed.x, y: ed.y, text, size: ed.size };
      commit([...els, el]);
    } else {
      const orig = els.find((e) => e.id === ed.id);
      if (!orig || orig.type !== "text") return;
      if (!text.trim()) commit(els.filter((e) => e.id !== ed.id));
      else if (text !== orig.text) commit(els.map((e) => (e.id === ed.id ? { ...orig, text } : e)));
    }
  }, [commit]);

  const startEditText = useCallback((el: TextEl) => {
    setSelected([]);
    setEditing({ id: el.id, x: el.x, y: el.y, text: el.text, size: el.size, stroke: el.stroke, isNew: false });
  }, []);

  useLayoutEffect(() => {
    if (editing) {
      const ta = textareaRef.current;
      if (ta && document.activeElement !== ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }
  }, [editing]);

  /* -------------------------------------------------------- style changes */
  const applyStyle = (patch: { stroke?: string; size?: SizeKey; fill?: boolean }) => {
    if (patch.stroke !== undefined) setColor(patch.stroke);
    if (patch.size !== undefined) setSize(patch.size);
    if (patch.fill !== undefined) setFill(patch.fill);
    if (editing) {
      setEditing({ ...editing, ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}), ...(patch.size ? { size: TEXT_SIZES[patch.size] } : {}) });
      return;
    }
    if (!selected.length) return;
    const next = elements.map((el) => {
      if (!selectedSet.has(el.id)) return el;
      let out: DrawEl = el;
      if (patch.stroke !== undefined) out = { ...out, stroke: patch.stroke };
      if (patch.size !== undefined) out = out.type === "text" ? { ...out, size: TEXT_SIZES[patch.size] } : { ...out, width: STROKE_WIDTHS[patch.size] };
      if (patch.fill !== undefined && (out.type === "rect" || out.type === "ellipse")) out = { ...out, fill: patch.fill };
      return out;
    });
    commit(next);
  };

  /* --------------------------------------------------------- view helpers */
  const viewportSize = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? [r.width, r.height] : [800, 600];
  };
  const zoomBy = (factor: number) => {
    const [w, h] = viewportSize();
    setView((v) => zoomAt(v, v.zoom * factor, w / 2, h / 2));
  };
  const resetZoom = () => {
    const [w, h] = viewportSize();
    setView((v) => zoomAt(v, 1, w / 2, h / 2));
  };
  const fitToContent = useCallback((els: DrawEl[]) => {
    const b = sceneBounds(els);
    const [w, h] = viewportSize();
    if (!b) { setView({ x: 0, y: 0, zoom: 1 }); return; }
    const pad = 48;
    const zoom = clampZoom(Math.min(2, Math.min((w - pad * 2) / Math.max(1, b.w), (h - pad * 2) / Math.max(1, b.h))));
    setView({ zoom, x: w / 2 - (b.x + b.w / 2) * zoom, y: h / 2 - (b.y + b.h / 2) * zoom });
  }, []);

  /* --------------------------------------------------------- deletion etc */
  const deleteSelected = useCallback(() => {
    const { selected: sel, hist: h } = st.current;
    if (!sel.length) return;
    const s = new Set(sel);
    commit(h.present.filter((e) => !s.has(e.id)));
    setSelected([]);
  }, [commit]);

  const changeTool = useCallback((next: Tool) => {
    commitText();
    setTool(next);
    if (next !== "select") setSelected([]);
  }, [commitText]);

  /* -------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if ((e.target as HTMLElement | null)?.closest?.('[role="menu"],[role="dialog"]')) return;
      if (!containerRef.current?.isConnected) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (e.key === " ") {
        e.preventDefault();
        if (!e.repeat) setSpaceDown(true);
        return;
      }
      if (dragRef.current) return;
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
      if (mod && k === "y") { e.preventDefault(); doRedo(); return; }
      if (mod && k === "a") {
        e.preventDefault();
        setTool("select");
        setSelected(st.current.hist.present.map((x) => x.id));
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") { if (st.current.selected.length) { e.preventDefault(); deleteSelected(); } return; }
      if (e.key === "Escape") { setSelected([]); return; }
      const nextTool = KEY_TO_TOOL[k];
      if (nextTool) { e.preventDefault(); changeTool(nextTool); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === " ") setSpaceDown(false); };
    const onBlur = () => setSpaceDown(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [changeTool, deleteSelected, doRedo, doUndo]);

  /* ------------------------------------------------------------- wheel */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025));
        setView((v) => zoomAt(v, v.zoom * factor, sx, sy));
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
      }
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  /* ----------------------------------------------------------- pointers */
  const selectionBounds = useMemo(() => {
    if (!selected.length || tool !== "select") return null;
    return unionBounds(shown.filter((e) => selectedSet.has(e.id)).map(elementBounds));
  }, [selected.length, selectedSet, shown, tool]);

  const cancelDrag = () => {
    dragRef.current = null;
    setDraft(null);
    setLive(null);
    setMarquee(null);
    setErasing(new Set());
    setPanning(false);
  };

  const eraseAt = (p: Pt, ids: Set<string>) => {
    const tol = HIT_TOL / st.current.view.zoom;
    let changed = false;
    for (const el of st.current.hist.present) {
      if (!ids.has(el.id) && hitTest(el, p[0], p[1], tol)) { ids.add(el.id); changed = true; }
    }
    if (changed) setErasing(new Set(ids));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== textareaRef.current && active !== document.body) active.blur?.();
    pointers.current.set(e.pointerId, toLocal(e));
    try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    // second touch → pinch zoom/pan, abandoning whatever the first finger started
    if (pointers.current.size === 2) {
      cancelDrag();
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], view: st.current.view };
      return;
    }
    if (pointers.current.size > 2) return;

    if (editing) { commitText(); }

    const [sx, sy] = toLocal(e);
    if (e.button === 1 || spaceDown || tool === "hand") {
      e.preventDefault();
      dragRef.current = { kind: "pan", sx, sy, view };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    const p = screenToWorld(view, sx, sy);
    const tol = HIT_TOL / view.zoom;

    switch (tool) {
      case "select": {
        const corner = (e.target as Element).getAttribute?.("data-corner") as Corner | null;
        if (corner && selectionBounds) {
          dragRef.current = { kind: "resize", corner, startBounds: selectionBounds, orig: elements, ids: new Set(selected) };
          return;
        }
        const hit = hitTopmost(elements, p[0], p[1], tol);
        if (hit) {
          let ids = selected;
          if (e.shiftKey) {
            ids = selectedSet.has(hit.id) ? selected.filter((id) => id !== hit.id) : [...selected, hit.id];
            setSelected(ids);
            if (!ids.includes(hit.id)) return;
          } else if (!selectedSet.has(hit.id)) {
            ids = [hit.id];
            setSelected(ids);
          }
          dragRef.current = { kind: "move", start: p, orig: elements, ids: new Set(ids), moved: false };
        } else {
          const base = e.shiftKey ? selected : [];
          if (!e.shiftKey) setSelected([]);
          dragRef.current = { kind: "marquee", start: p, additive: e.shiftKey, base };
        }
        return;
      }
      case "pen":
        setDraft({ id: newId(), type: "pen", stroke: color, width: strokeWidth, points: [p] });
        dragRef.current = { kind: "draw", start: p };
        return;
      case "line":
      case "arrow":
        setDraft({ id: newId(), type: tool, stroke: color, width: strokeWidth, x1: p[0], y1: p[1], x2: p[0], y2: p[1] });
        dragRef.current = { kind: "draw", start: p };
        return;
      case "rect":
      case "ellipse":
        setDraft({ id: newId(), type: tool, stroke: color, width: strokeWidth, x: p[0], y: p[1], w: 0, h: 0, fill });
        dragRef.current = { kind: "draw", start: p };
        return;
      case "text": {
        e.preventDefault(); // keep focus on the textarea we are about to open
        const hit = hitTopmost(elements.filter((x) => x.type === "text"), p[0], p[1], tol);
        if (hit && hit.type === "text") startEditText(hit);
        else {
          const sz = TEXT_SIZES[size];
          setEditing({ id: newId(), x: p[0], y: p[1] - (sz * TEXT_LINE_HEIGHT) / 2, text: "", size: sz, stroke: color, isNew: true });
        }
        return;
      }
      case "eraser": {
        const ids = new Set<string>();
        dragRef.current = { kind: "erase", ids };
        eraseAt(p, ids);
        return;
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, toLocal(e));
    const pinch = pinchRef.current;
    if (pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const z = zoomAt(pinch.view, pinch.view.zoom * (dist / pinch.dist), pinch.mid[0], pinch.mid[1]);
      setView({ ...z, x: z.x + mid[0] - pinch.mid[0], y: z.y + mid[1] - pinch.mid[1] });
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "pan") {
      const [sx, sy] = toLocal(e);
      setView({ ...d.view, x: d.view.x + sx - d.sx, y: d.view.y + sy - d.sy });
      return;
    }
    const p = toWorld(e);
    switch (d.kind) {
      case "draw":
        setDraft(((dr: DrawEl | null): DrawEl | null => {
          if (!dr) return dr;
          switch (dr.type) {
            case "pen": {
              const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [];
              const pts: Pt[] = events.length ? events.map((ev) => toWorld(ev)) : [p];
              const minD = 1 / st.current.view.zoom;
              const out = dr.points.slice();
              for (const q of pts) {
                const last = out[out.length - 1];
                if (Math.hypot(q[0] - last[0], q[1] - last[1]) >= minD) out.push(q);
              }
              return out.length === dr.points.length ? dr : { ...dr, points: out };
            }
            case "line":
            case "arrow": {
              let [x2, y2] = p;
              if (e.shiftKey) {
                const ang = Math.round(Math.atan2(y2 - d.start[1], x2 - d.start[0]) / (Math.PI / 12)) * (Math.PI / 12);
                const len = Math.hypot(x2 - d.start[0], y2 - d.start[1]);
                x2 = d.start[0] + Math.cos(ang) * len;
                y2 = d.start[1] + Math.sin(ang) * len;
              }
              return { ...dr, x2, y2 };
            }
            case "rect":
            case "ellipse": {
              let [x2, y2] = p;
              if (e.shiftKey) {
                const s = Math.max(Math.abs(x2 - d.start[0]), Math.abs(y2 - d.start[1]));
                x2 = d.start[0] + Math.sign(x2 - d.start[0] || 1) * s;
                y2 = d.start[1] + Math.sign(y2 - d.start[1] || 1) * s;
              }
              return { ...dr, ...normRect(d.start[0], d.start[1], x2, y2) };
            }
            default:
              return dr;
          }
        })(draftRef.current));
        return;
      case "move": {
        const dx = p[0] - d.start[0];
        const dy = p[1] - d.start[1];
        if (!d.moved && Math.hypot(dx, dy) * st.current.view.zoom < 2) return;
        d.moved = true;
        setLive(d.orig.map((el) => (d.ids.has(el.id) ? translateElement(el, dx, dy) : el)));
        return;
      }
      case "resize": {
        const nb = resizeBounds(d.startBounds, d.corner, p[0], p[1], e.shiftKey);
        setLive(d.orig.map((el) => (d.ids.has(el.id) ? scaleElement(el, d.startBounds, nb) : el)));
        return;
      }
      case "marquee": {
        const box = normRect(d.start[0], d.start[1], p[0], p[1]);
        setMarquee(box);
        const inside = elementsInBox(st.current.hist.present, box);
        setSelected(d.additive ? [...new Set([...d.base, ...inside])] : inside);
        return;
      }
      case "erase":
        eraseAt(p, d.ids);
        return;
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pinchRef.current) {
      if (pointers.current.size < 2) pinchRef.current = null;
      return;
    }
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    switch (d.kind) {
      case "pan":
        setPanning(false);
        return;
      case "draw": {
        const dr = draftRef.current;
        setDraft(null);
        if (!dr) return;
        let final: DrawEl = dr;
        if (final.type === "pen") final = { ...final, points: simplifyPoints(final.points, 0.35 / view.zoom) };
        if (!isDegenerate(final)) commit([...elements, final]);
        return;
      }
      case "move":
      case "resize":
        if (liveRef.current) commit(liveRef.current);
        setLive(null);
        return;
      case "marquee":
        setMarquee(null);
        return;
      case "erase":
        if (d.ids.size) commit(elements.filter((el) => !d.ids.has(el.id)));
        setErasing(new Set());
        return;
    }
  };

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    cancelDrag();
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tool !== "select") return;
    const p = toWorld(e);
    const hit = hitTopmost(elements, p[0], p[1], HIT_TOL / view.zoom);
    if (hit?.type === "text") startEditText(hit);
  };

  /* ------------------------------------------------------------ actions */
  const resolveColors = () => {
    const root = getComputedStyle(document.documentElement);
    const fgRaw = containerRef.current ? getComputedStyle(containerRef.current).color : root.getPropertyValue("--foreground");
    const foreground = toSrgb(fgRaw, "#111111");
    const background = toSrgb(root.getPropertyValue("--background"), "#ffffff");
    return { foreground, background };
  };

  const buildSvg = () => {
    const { foreground, background } = resolveColors();
    return sceneToSvg(elements, { foreground, background: transparentBg ? null : background });
  };

  const exportSvg = () => {
    if (!elements.length) return toast.error(t("tool.mini-draw.empty"));
    download(new Blob([buildSvg().svg], { type: "image/svg+xml" }), `${fileBase(name)}-${stamp()}.svg`);
  };

  const exportPng = () => {
    if (!elements.length) return toast.error(t("tool.mini-draw.empty"));
    const { svg, width, height } = buildSvg();
    const scale = Math.max(0.1, Math.min(2, 8192 / Math.max(width, height)));
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = Math.round(width * scale);
        c.height = Math.round(height * scale);
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? download(b, `${fileBase(name)}-${stamp()}.png`) : toast.error(t("tool.mini-draw.exportFailed"))), "image/png");
      } catch {
        toast.error(t("tool.mini-draw.exportFailed"));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast.error(t("tool.mini-draw.exportFailed")); };
    img.src = url;
  };

  const exportJson = () => {
    download(new Blob([serializeScene(elements)], { type: "application/json" }), `${fileBase(name)}-${stamp()}.json`);
  };

  const importJson = async (file: File) => {
    try {
      const els = parseScene(await file.text());
      commit(els);
      setSelected([]);
      fitToContent(els);
      toast.success(t("tool.mini-draw.imported"));
    } catch {
      toast.error(t("tool.mini-draw.importFailed"));
    }
  };

  const clearAll = () => {
    if (elements.length) commit([]);
    setSelected([]);
    setConfirmClear(false);
  };

  /* -------------------------------------------------------------- render */
  const gridGap = (() => { let g = 24 * view.zoom; while (g < 12) g *= 4; return g; })();
  const handleSize = 9 / view.zoom;
  const cursor = panning ? "grabbing" : spaceDown || tool === "hand" ? "grab" : tool === "select" ? "default" : tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair";
  const editingScreen = editing ? worldToScreen(view, editing.x, editing.y) : null;
  const editingLines = editing ? editing.text.split("\n") : [];
  const swatchStyle = (c: string) => ({ background: c === FG ? "var(--foreground)" : c });
  const isCustom = !PALETTE.includes(color);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] px-3 py-2 [scrollbar-width:thin]">
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--muted)]/50 p-0.5">
          {TOOLS.map(({ id, key, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeTool(id)}
              title={`${t(`tool.mini-draw.tool.${id}`)} (${key})`}
              aria-label={t(`tool.mini-draw.tool.${id}`)}
              aria-pressed={tool === id}
              className={cn(
                "relative flex size-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]",
                tool === id && "bg-[var(--card)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)] hover:text-[var(--primary)]",
              )}
            >
              <Icon className="size-4" />
              <span className="absolute bottom-0 right-0.5 text-[8px] leading-none opacity-50">{key}</span>
            </button>
          ))}
        </div>
        <div className="h-6 w-px shrink-0 bg-[var(--border)]" />
        <div className="flex shrink-0 items-center gap-1" role="radiogroup" aria-label={t("tool.mini-draw.color")}>
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c === FG ? t("tool.mini-draw.defaultColor") : c}
              title={c === FG ? t("tool.mini-draw.defaultColor") : c}
              onClick={() => applyStyle({ stroke: c })}
              className={cn("size-6 rounded-full ring-offset-2 ring-offset-[var(--background)] transition-shadow", color === c ? "ring-2 ring-[var(--ring)]" : "ring-1 ring-[var(--border)]")}
              style={swatchStyle(c)}
            />
          ))}
          <label
            title={t("tool.mini-draw.customColor")}
            className={cn("relative size-6 cursor-pointer overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--background)]", isCustom ? "ring-2 ring-[var(--ring)]" : "ring-1 ring-[var(--border)]")}
            style={{ background: isCustom ? color : "conic-gradient(#e5484d, #d4a017, #30a46c, #3e83f8, #8e4ec6, #e5484d)" }}
          >
            <input
              type="color"
              aria-label={t("tool.mini-draw.customColor")}
              value={isCustom ? color : customColor}
              onChange={(e) => { setCustomColor(e.target.value); applyStyle({ stroke: e.target.value }); }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        <div className="h-6 w-px shrink-0 bg-[var(--border)]" />
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--muted)]/50 p-0.5" role="radiogroup" aria-label={t("tool.mini-draw.strokeWidth")}>
          {(["s", "m", "l"] as SizeKey[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={size === k}
              title={t(`tool.mini-draw.size.${k}`)}
              onClick={() => applyStyle({ size: k })}
              className={cn("flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)]", size === k && "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]")}
            >
              <span className="block w-4 rounded-full bg-current" style={{ height: STROKE_WIDTHS[k] - (k === "l" ? 2 : 0) }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={fill}
          title={t("tool.mini-draw.fill")}
          onClick={() => applyStyle({ fill: !fill })}
          className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--muted-foreground)] ring-1 ring-[var(--border)]", fill && "bg-[var(--card)] text-[var(--foreground)] shadow-sm")}
        >
          <PaintBucket className="size-3.5" />
          <span>{t("tool.mini-draw.fill")}</span>
        </button>
        {selected.length > 0 && (
          <>
            <div className="h-6 w-px shrink-0 bg-[var(--border)]" />
            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{selected.length} {t("tool.mini-draw.selected")}</span>
            <Button variant="ghost" size="icon" className="size-8 shrink-0 hover:text-red-500" onClick={deleteSelected} title={`${t("tool.mini-draw.delete")} (Del)`} aria-label={t("tool.mini-draw.delete")}><Trash2 className="size-4" /></Button>
          </>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          <Button variant="ghost" size="icon" className="size-8" onClick={doUndo} disabled={!canUndo(hist)} title={`${t("tool.mini-draw.undo")} (Ctrl/⌘+Z)`} aria-label={t("tool.mini-draw.undo")}><Undo2 className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={doRedo} disabled={!canRedo(hist)} title={`${t("tool.mini-draw.redo")} (Shift+Ctrl/⌘+Z)`} aria-label={t("tool.mini-draw.redo")}><Redo2 className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => fileRef.current?.click()} title={t("tool.mini-draw.import")} aria-label={t("tool.mini-draw.import")}><Upload className="size-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="size-3.5" />{t("tool.mini-draw.export")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportPng}><ImageDown />PNG</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportSvg}><FileCode />SVG</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportJson}><FileJson />{t("tool.mini-draw.sceneJson")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTransparentBg((v) => !v); }}>
                <span className={cn("flex size-4 items-center justify-center rounded border border-[var(--border)]", transparentBg && "bg-[var(--primary)] text-[var(--primary-foreground)]")}>{transparentBg && <Check className="size-3" />}</span>
                {t("tool.mini-draw.transparentBg")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="size-8 hover:text-red-500" onClick={() => setConfirmClear(true)} disabled={!elements.length} title={t("tool.mini-draw.clear")} aria-label={t("tool.mini-draw.clear")}><Trash2 className="size-4" /></Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* canvas */}
      <div ref={containerRef} className="relative min-h-[320px] flex-1 overflow-hidden text-[var(--foreground)]">
        <svg
          ref={svgRef}
          className="absolute inset-0 size-full touch-none select-none outline-none"
          style={{ cursor }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onDoubleClick={onDoubleClick}
          onMouseDown={(e) => e.preventDefault() /* keep focus on the text editor; no native selection */}
          onContextMenu={(e) => e.preventDefault()}
          onAuxClick={(e) => e.preventDefault()}
          role="img"
          aria-label={t("tool.mini-draw.canvas")}
        >
          <defs>
            <pattern id="mini-draw-dots" patternUnits="userSpaceOnUse" x={view.x} y={view.y} width={gridGap} height={gridGap}>
              <circle cx={1} cy={1} r={1} style={{ fill: "var(--muted-foreground)" }} opacity={0.3} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mini-draw-dots)" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {shown.map((el) => (editing && el.id === editing.id ? null : <ElementView key={el.id} el={el} faded={erasing.has(el.id)} />))}
            {draft && <ElementView el={draft} />}
            {tool === "select" &&
              selected.length > 1 &&
              shown.filter((el) => selectedSet.has(el.id)).map((el) => {
                const b = elementBounds(el);
                return <rect key={el.id} x={b.x} y={b.y} width={b.w} height={b.h} fill="none" style={{ stroke: "var(--primary)" }} strokeOpacity={0.45} strokeWidth={1 / view.zoom} pointerEvents="none" />;
              })}
            {selectionBounds && (() => {
              const pad = 4 / view.zoom;
              const b = { x: selectionBounds.x - pad, y: selectionBounds.y - pad, w: selectionBounds.w + pad * 2, h: selectionBounds.h + pad * 2 };
              const corners: [Corner, number, number][] = [["nw", b.x, b.y], ["ne", b.x + b.w, b.y], ["sw", b.x, b.y + b.h], ["se", b.x + b.w, b.y + b.h]];
              return (
                <g>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" style={{ stroke: "var(--primary)" }} strokeWidth={1.25 / view.zoom} strokeDasharray={`${5 / view.zoom} ${4 / view.zoom}`} pointerEvents="none" />
                  {!live
                    ? corners.map(([c, x, y]) => (
                        <g key={c} style={{ cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize" }}>
                          <rect data-corner={c} x={x - handleSize} y={y - handleSize} width={handleSize * 2} height={handleSize * 2} fill="transparent" />
                          <rect data-corner={c} x={x - handleSize / 2} y={y - handleSize / 2} width={handleSize} height={handleSize} rx={2 / view.zoom} style={{ fill: "var(--background)", stroke: "var(--primary)" }} strokeWidth={1.5 / view.zoom} />
                        </g>
                      ))
                    : null}
                </g>
              );
            })()}
            {marquee && (
              <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} style={{ fill: "var(--primary)", stroke: "var(--primary)" }} fillOpacity={0.08} strokeWidth={1 / view.zoom} pointerEvents="none" />
            )}
          </g>
        </svg>

        {editing && editingScreen && (
          <textarea
            ref={textareaRef}
            value={editing.text}
            spellCheck={false}
            aria-label={t("tool.mini-draw.tool.text")}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); commitText(); }
              e.stopPropagation();
            }}
            placeholder={t("tool.mini-draw.textPlaceholder")}
            className="absolute m-0 resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 outline-1 outline-dashed outline-[var(--primary)] placeholder:text-[var(--muted-foreground)]/60"
            style={{
              left: editingScreen[0],
              top: editingScreen[1],
              fontFamily: FONT_FAMILY,
              fontSize: editing.size * view.zoom,
              lineHeight: TEXT_LINE_HEIGHT,
              color: editing.stroke === FG ? "var(--foreground)" : editing.stroke,
              width: (Math.max(8, ...editingLines.map((l) => l.length)) + 2) * editing.size * TEXT_CHAR_WIDTH * view.zoom,
              height: editingLines.length * editing.size * TEXT_LINE_HEIGHT * view.zoom,
            }}
          />
        )}

        {!shown.length && !draft && !editing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--muted-foreground)]">
            <div>
              <div className="font-medium">{t("tool.mini-draw.emptyTitle")}</div>
              <div className="mt-1 text-xs opacity-80">{t("tool.mini-draw.emptyHint")}</div>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5 shadow-sm backdrop-blur-md">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => zoomBy(1 / 1.2)} title={t("tool.mini-draw.zoomOut")} aria-label={t("tool.mini-draw.zoomOut")}><ZoomOut className="size-3.5" /></Button>
          <button type="button" onClick={resetZoom} title={t("tool.mini-draw.resetZoom")} className="min-w-12 rounded-md px-1 text-xs tabular-nums text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{Math.round(view.zoom * 100)}%</button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => zoomBy(1.2)} title={t("tool.mini-draw.zoomIn")} aria-label={t("tool.mini-draw.zoomIn")}><ZoomIn className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => fitToContent(elements)} title={t("tool.mini-draw.fit")} aria-label={t("tool.mini-draw.fit")}><Maximize className="size-3.5" /></Button>
        </div>
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-sm p-5">
          <DialogTitle className="text-base font-semibold">{t("tool.mini-draw.clearTitle")}</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-[var(--muted-foreground)]">{t("tool.mini-draw.clearDesc")}</DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>{t("tool.mini-draw.cancel")}</Button>
            <Button variant="destructive" size="sm" onClick={clearAll}>{t("tool.mini-draw.clear")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
