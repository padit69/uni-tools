import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { tools } from "@/tools/registry";
import { categories } from "@/tools/types";

export default function Home() {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-8 md:p-12">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs text-[var(--muted-foreground)] backdrop-blur">
          <Sparkles className="size-3" />
          <span>Bộ công cụ dev — chạy 100% trên trình duyệt</span>
        </div>
        <h1 className="bg-gradient-to-br from-orange-400 via-fuchsia-500 to-indigo-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
          uni · tool
        </h1>
        <p className="mt-3 max-w-xl text-balance text-sm text-[var(--muted-foreground)] md:text-base">
          Một nơi cho mọi tool dev hay dùng. JSON, encode, generator, converter, text utilities — và sẽ thêm nữa.
        </p>
        <div className="mt-5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <span>Bấm</span>
          <kbd className="rounded border border-[var(--border)] bg-white/5 px-1.5 py-0.5 font-mono">⌘K</kbd>
          <span>để tìm tool nhanh.</span>
        </div>
      </div>

      <div className="mx-auto mt-10 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              to={`/tools/${t.slug}`}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-orange-400/30 to-fuchsia-500/30 ring-1 ring-white/10">
                  <Icon className="size-5" />
                </div>
                <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-60" />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold tracking-tight">{t.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    {categories[t.category].label}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">
                  {t.description}
                </p>
              </div>
            </Link>
          );
        })}

        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted-foreground)]">
          <Sparkles className="size-4" />
          <p>Thêm tool mới = thêm 1 entry trong <code className="font-mono">tools/registry.ts</code></p>
        </div>
      </div>
    </div>
  );
}
