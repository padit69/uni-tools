import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface HistoryEntry {
  input: string;
  ts: number;
  /** Action that produced the entry, e.g. "format", "minify", "save". */
  action?: string;
  /** Result of the action, when it fits the size limit. */
  output?: string;
  /** Optional label (e.g. source file name). */
  label?: string;
}

export interface HistoryOptions {
  /** Max number of entries kept (default 10). */
  max?: number;
  /** Max characters stored per field; bigger values are dropped to protect localStorage (default 200k). */
  maxChars?: number;
}

export interface PushMeta {
  action?: string;
  output?: string;
  label?: string;
}

export function useToolHistory(toolId: string, { max = 10, maxChars = 200_000 }: HistoryOptions = {}) {
  const [entries, setEntries] = useLocalStorage<HistoryEntry[]>(`uni-tool:${toolId}:history`, []);

  const push = useCallback(
    (input: string, meta: PushMeta = {}) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.length > maxChars) return false;
      const output = meta.output && meta.output.length <= maxChars ? meta.output : undefined;
      setEntries((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        // Same input + same action → move to top instead of duplicating.
        const dedup = list.filter((e) => !(e.input === trimmed && (e.action ?? "") === (meta.action ?? "")));
        // ts doubles as the entry id, so keep it unique even for pushes in the same millisecond.
        const ts = Math.max(Date.now(), ...list.map((e) => e.ts + 1));
        const entry: HistoryEntry = { input: trimmed, ts };
        if (meta.action) entry.action = meta.action;
        if (output !== undefined) entry.output = output;
        if (meta.label) entry.label = meta.label;
        return [entry, ...dedup].slice(0, max);
      });
      return true;
    },
    [setEntries, max, maxChars]
  );

  const remove = useCallback(
    (ts: number) => setEntries((prev) => (Array.isArray(prev) ? prev.filter((e) => e.ts !== ts) : [])),
    [setEntries]
  );

  const clear = useCallback(() => setEntries([]), [setEntries]);

  return { entries: Array.isArray(entries) ? entries : [], push, remove, clear };
}
