import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const STORAGE_KEY = "tool-info-seen";

/** Tracks which tools the user has dismissed the intro info dialog for. */
export function useToolInfoSeen() {
  const [seen, setSeen] = useLocalStorage<Record<string, true>>(STORAGE_KEY, {});

  const hasSeen = useCallback((toolId: string) => Boolean(seen[toolId]), [seen]);

  const markSeen = useCallback(
    (toolId: string) => {
      setSeen((prev) => ({ ...prev, [toolId]: true }));
    },
    [setSeen]
  );

  return { hasSeen, markSeen };
}
