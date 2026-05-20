import type { Tool } from "@/tools/types";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useI18n } from "@/i18n";

interface ToolInfoDialogProps {
  tool: Tool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToolInfoDialog({ tool, open, onOpenChange }: ToolInfoDialogProps) {
  const { t, categoryLabel, toolDesc, toolFeatures } = useI18n();
  const Icon = tool.icon;
  const features = toolFeatures(tool.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,640px)] overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400/30 to-fuchsia-500/30 ring-1 ring-white/10">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg font-semibold leading-tight">{tool.name}</DialogTitle>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              {categoryLabel(tool.category)}
            </p>
          </div>
        </div>

        <DialogDescription className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {toolDesc(tool.id, tool.description)}
        </DialogDescription>

        {features.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-[var(--foreground)]">{t("toolInfo.featuresTitle")}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted-foreground)]">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2 leading-snug">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-400/80" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-[var(--muted-foreground)]">{t("toolInfo.privacyNote")}</p>

        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button>{t("toolInfo.gotIt")}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
