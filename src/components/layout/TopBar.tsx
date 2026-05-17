import { Github, Info, Languages, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useCommandPalette } from "@/components/command-palette/useCommandPalette";
import { getToolBySlug } from "@/tools/registry";
import { useI18n } from "@/i18n";

export function TopBar() {
  const { open } = useCommandPalette();
  const { lang, setLang, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const slug = location.pathname.startsWith("/tools/")
    ? location.pathname.replace("/tools/", "").split("/")[0]
    : null;
  const tool = slug ? getToolBySlug(slug) : null;

  return (
    <div className="flex h-14 items-center justify-between gap-2 px-3 md:gap-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Link to="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          {t("nav.home")}
        </Link>
        {tool && (
          <>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span className="truncate font-medium">{tool.name}</span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <Button
          variant="glass"
          size="sm"
          onClick={open}
          className="gap-2 px-2 text-xs text-[var(--muted-foreground)] sm:px-3"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">{t("search.placeholder")}</span>
          <kbd className="ml-2 hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </Button>
        <div className="hidden items-center gap-2 md:flex">
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
          <Button variant="ghost" size="icon" asChild aria-label={t("nav.info")} title={t("nav.info")}>
            <Link to="/info">
              <Info className="size-4" />
            </Link>
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="glass" size="sm" className="px-2 md:hidden" aria-label="Menu">
              <Menu className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/info">
                <Info className="size-4" />
                {t("nav.info")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLang(lang === "vi" ? "en" : "vi")}>
              <Languages className="size-4" />
              {t("topbar.language")} ({lang.toUpperCase()})
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/padit69/uni-tools" target="_blank" rel="noreferrer">
                <Github className="size-4" />
                GitHub
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme("light")} data-active={theme === "light"}>
              <Sun className="size-4" />
              {t("theme.light")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("dark")} data-active={theme === "dark"}>
              <Moon className="size-4" />
              {t("theme.dark")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("system")} data-active={theme === "system"}>
              <Monitor className="size-4" />
              {t("theme.system")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
