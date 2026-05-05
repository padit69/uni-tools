import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { groupToolsByCategory } from "@/tools/registry";
import type { Tool } from "@/tools/types";

function matchTool(t: Tool, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    t.name.toLowerCase().includes(needle) ||
    t.description.toLowerCase().includes(needle) ||
    t.keywords.some((k) => k.toLowerCase().includes(needle))
  );
}

export function Sidebar() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => groupToolsByCategory(), []);
  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, tools: g.tools.filter((t) => matchTool(t, q)) }))
        .filter((g) => g.tools.length > 0),
    [groups, q]
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-3 p-3">
      <NavLink to="/" className="flex items-center gap-2 px-2 py-1">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-orange-400 via-fuchsia-500 to-indigo-500 text-white shadow">
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">uni · tool</span>
          <span className="text-[10px] text-[var(--muted-foreground)]">dev toolbox</span>
        </div>
      </NavLink>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tool..."
          className="h-8 pl-8 text-xs"
        />
      </div>

      <ScrollArea className="-mx-1 flex-1 px-1">
        <nav className="flex flex-col gap-4 pb-3">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-[var(--muted-foreground)]">
              Không có tool nào khớp.
            </p>
          )}
          {filtered.map((g) => (
            <div key={g.category} className="flex flex-col gap-1">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                {g.label}
              </div>
              {g.tools.map((t) => {
                const Icon = t.icon;
                return (
                  <NavLink
                    key={t.id}
                    to={`/tools/${t.slug}`}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        "hover:bg-[var(--muted)]",
                        isActive
                          ? "bg-[var(--muted)] text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
