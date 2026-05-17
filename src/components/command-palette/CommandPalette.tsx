import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { ArrowRight, Search } from "lucide-react";
import { useCommandPalette, useCommandPaletteHotkey } from "./useCommandPalette";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { tools } from "@/tools/registry";
import { categories } from "@/tools/types";
import { useI18n } from "@/i18n";

export function CommandPalette() {
  const { isOpen, setOpen, close } = useCommandPalette();
  const { t, categoryLabel, toolDesc } = useI18n();
  const navigate = useNavigate();
  useCommandPaletteHotkey();

  const grouped = Object.keys(categories).map((catKey) => {
    const cat = catKey as keyof typeof categories;
    return {
      cat,
      label: categoryLabel(cat),
      tools: tools.filter((t) => t.category === cat),
    };
  }).filter((g) => g.tools.length > 0);

  const onSelect = (slug: string) => {
    close();
    navigate(`/tools/${slug}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">{t("search.commandPlaceholder")}</DialogTitle>
        <Command className="flex flex-col" loop>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
            <Search className="size-4 text-[var(--muted-foreground)]" />
            <Command.Input
              autoFocus
              placeholder={t("search.commandPlaceholder")}
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] sm:inline-block">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
              {t("search.empty")}
            </Command.Empty>

            {grouped.map((g) => (
              <Command.Group
                key={g.cat}
                heading={g.label}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-[var(--muted-foreground)]"
              >
                {g.tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Command.Item
                      key={t.id}
                      value={`${t.name} ${t.keywords.join(" ")} ${toolDesc(t.id, t.description)}`}
                      onSelect={() => onSelect(t.slug)}
                      className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm aria-selected:bg-[var(--muted)]"
                    >
                      <div className="grid size-7 place-items-center rounded-md bg-[var(--muted)]">
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium">{t.name}</span>
                        <span className="line-clamp-1 text-xs text-[var(--muted-foreground)]">
                          {toolDesc(t.id, t.description)}
                        </span>
                      </div>
                      {t.shortcut && (
                        <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                          {t.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className="size-3.5 opacity-0 group-aria-selected:opacity-60" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
