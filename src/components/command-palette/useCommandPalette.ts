import { useEffect, useState } from "react";

type Listener = (open: boolean) => void;

let _open = false;
const _listeners = new Set<Listener>();

function _set(next: boolean) {
  if (next === _open) return;
  _open = next;
  _listeners.forEach((l) => l(_open));
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(_open);

  useEffect(() => {
    const l: Listener = (v) => setIsOpen(v);
    _listeners.add(l);
    return () => {
      _listeners.delete(l);
    };
  }, []);

  return {
    isOpen,
    open: () => _set(true),
    close: () => _set(false),
    toggle: () => _set(!_open),
    setOpen: (v: boolean) => _set(v),
  };
}

/** Mount once (in AppShell) to register ⌘K / Ctrl+K hotkey. */
export function useCommandPaletteHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        _set(!_open);
      }
      if (e.key === "Escape" && _open) {
        _set(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
