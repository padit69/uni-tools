import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface HistoryEntry {
  input: string;
  ts: number;
}

const MAX = 10;

export function useToolHistory(toolId: string) {
  const [entries, setEntries] = useLocalStorage<HistoryEntry[]>(
    `uni-tool:${toolId}:history`,
    []
  );

  const push = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      setEntries((prev) => {
        const dedup = prev.filter((e) => e.input !== trimmed);
        return [{ input: trimmed, ts: Date.now() }, ...dedup].slice(0, MAX);
      });
    },
    [setEntries]
  );

  const clear = useCallback(() => setEntries([]), [setEntries]);

  return { entries, push, clear };
}
