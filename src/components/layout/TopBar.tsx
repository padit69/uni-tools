import { Github, Languages, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { useCommandPalette } from "@/components/command-palette/useCommandPalette";
import { getToolBySlug } from "@/tools/registry";
import { useI18n } from "@/i18n";

export function TopBar() {
  const { open } = useCommandPalette();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const slug = location.pathname.startsWith("/tools/")
    ? location.pathname.replace("/tools/", "").split("/")[0]
    : null;
  const tool = slug ? getToolBySlug(slug) : null;

  return (
    <div className="flex h-14 items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          {t("nav.home")}
        </Link>
        {tool && (
          <>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span className="font-medium">{tool.name}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="glass"
          size="sm"
          onClick={open}
          className="gap-2 text-xs text-[var(--muted-foreground)]"
        >
          <Search className="size-3.5" />
          <span>{t("search.placeholder")}</span>
          <kbd className="ml-2 hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="gap-1.5 text-xs"
          title={t("topbar.language")}
        >
          <Languages className="size-4" />
          {lang.toUpperCase()}
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label={t("topbar.github")}>
          <a href="https://github.com/padit69/uni-tools" target="_blank" rel="noreferrer">
            <Github className="size-4" />
          </a>
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
}
