import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { getToolBySlug, tools } from "@/tools/registry";
import { DROP_PARAM, MAX_DROP_BYTES, deliverFile, openFileInNewTab, receiveFileFromOpener, routeFile } from "@/lib/fileDrop";

const claimed = new Set<string>(); // guards StrictMode double effects

function hasFiles(e: DragEvent) {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
}

/** Full-window drop target: drop a file anywhere to open it in the matching tool. */
export function GlobalFileDrop() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const depth = useRef(0);
  const loc = useRef(location.pathname);
  loc.current = location.pathname;

  // Tab opened from another tab's drop: pull the file from the opener.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get(DROP_PARAM);
    if (!id || claimed.has(id)) return;
    claimed.add(id);
    params.delete(DROP_PARAM);
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`, { replace: true });
    void receiveFileFromOpener(id).then((f) => {
      if (!f) toast.error(t("drop.transferFailed"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setActive(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      const fileCount = e.dataTransfer?.files?.length ?? 0;
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (file.size > MAX_DROP_BYTES) {
        toast.error(t("drop.tooLarge"), { description: file.name });
        return;
      }
      let text: string;
      try {
        text = await file.text();
      } catch {
        toast.error(t("drop.readFailed"), { description: file.name });
        return;
      }
      const route = routeFile(file.name, file.type, text);
      const tool = route && (getToolBySlug(route.toolId) ?? tools.find((x) => x.id === route.toolId));
      if (!route || !tool) {
        toast.error(t("drop.unsupported"), { description: file.name });
        return;
      }
      const dropped = { ...route, text, fileName: file.name };
      const path = `/tools/${tool.slug}`;
      const openHere = () => {
        deliverFile(dropped);
        if (loc.current !== path) navigate(path);
        toast.success(t("drop.opened").replace("{tool}", tool.name), { description: file.name });
      };
      if (fileCount > 1) toast.info(t("drop.onlyFirst"));

      // On Home nothing can be lost: open right here. Elsewhere, offer a new tab so the
      // current workspace stays intact (browsers only allow window.open from a click).
      if (loc.current === "/") {
        openHere();
        return;
      }
      toast(t("drop.where").replace("{tool}", tool.name), {
        description: file.name,
        duration: 15000,
        action: {
          label: t("drop.newTab"),
          onClick: () => {
            if (!openFileInNewTab(path, dropped)) toast.error(t("drop.popupBlocked"));
          },
        },
        cancel: { label: t("drop.here"), onClick: openHere },
      });
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [navigate, t]);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]/70 p-4 backdrop-blur-sm">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--primary)] bg-[var(--card)] px-8 py-10 text-center shadow-xl">
        <div className="grid size-14 place-items-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
          <FileUp className="size-7" />
        </div>
        <p className="text-base font-semibold">{t("drop.title")}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{t("drop.hint")}</p>
      </div>
    </div>
  );
}
