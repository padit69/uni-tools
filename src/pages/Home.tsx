import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { tools } from "@/tools/registry";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import { useI18n } from "@/i18n";

export default function Home() {
  const { t, categoryLabel, toolDesc } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [idea, setIdea] = useState("");

  const mailto = useMemo(() => {
    const body = [`Name: ${name || "-"}`, `Contact: ${contact || "-"}`, "", "Feedback / tool request:", idea].join("\n");
    return `mailto:hello@tools.hihi.team?subject=${encodeURIComponent("Uni Tools feedback")}&body=${encodeURIComponent(body)}`;
  }, [name, contact, idea]);

  const copyRequest = async () => {
    const text = [`Uni Tools feedback`, `Name: ${name || "-"}`, `Contact: ${contact || "-"}`, "", idea].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success(t("feedback.copied"));
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-8 md:p-12">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-xs text-[var(--muted-foreground)] backdrop-blur">
          <Sparkles className="size-3" />
          <span>{t("app.tagline")}</span>
        </div>
        <h1 className="bg-gradient-to-br from-orange-400 via-fuchsia-500 to-indigo-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
          uni · tools
        </h1>
        <p className="mt-3 max-w-xl text-balance text-sm text-[var(--muted-foreground)] md:text-base">
          {t("app.description")}
        </p>
        <div className="mt-5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <span>{t("app.quickSearchHint.before")}</span>
          <kbd className="rounded border border-[var(--border)] bg-white/5 px-1.5 py-0.5 font-mono">⌘K</kbd>
          <span>{t("app.quickSearchHint.after")}</span>
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
                    {categoryLabel(t.category)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">
                  {toolDesc(t.id, t.description)}
                </p>
              </div>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-gradient-to-br from-orange-400/10 via-fuchsia-500/10 to-indigo-500/10 p-5 text-left transition hover:border-orange-400/60 hover:from-orange-400/15 hover:via-fuchsia-500/15 hover:to-indigo-500/15 sm:col-span-2 lg:col-span-3"
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-[radial-gradient(circle_at_20%_20%,rgba(251,146,60,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(217,70,239,0.16),transparent_35%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400/25 to-fuchsia-500/25 ring-1 ring-white/10">
                <Mail className="size-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">{t("cta.title")}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t("cta.desc")}</p>
              </div>
            </div>
            <span className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm transition group-hover:translate-x-0.5">
              {t("cta.button")}
              <ArrowRight className="ml-1.5 size-4" />
            </span>
          </div>
        </button>
      </div>

      <footer className="mx-auto mt-auto flex w-full max-w-4xl flex-col gap-2 pt-8 text-[11px] text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2">
          <Link to="/info" className="transition hover:text-[var(--foreground)]">{t("nav.info")}</Link>
          <span>/</span>
          <Link to="/policy" className="transition hover:text-[var(--foreground)]">{t("nav.policy")}</Link>
          <span>/</span>
          <Link to="/terms" className="transition hover:text-[var(--foreground)]">{t("nav.terms")}</Link>
        </nav>
        <p>{t("footer.copyright")}</p>
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-5">
          <DialogTitle className="text-lg font-semibold">{t("feedback.title")}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[var(--muted-foreground)]">
            {t("feedback.desc")}
          </DialogDescription>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-xs font-medium">
              {t("feedback.name")}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("feedback.namePlaceholder")} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
              {t("feedback.contact")}
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("feedback.contactPlaceholder")} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
              {t("feedback.idea")}
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t("feedback.ideaPlaceholder")} className="min-h-32 resize-y rounded-lg border border-[var(--border)] bg-[var(--input)] p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <DialogClose asChild><Button variant="ghost">{t("feedback.close")}</Button></DialogClose>
            <Button variant="secondary" onClick={copyRequest} disabled={!idea.trim()}>{t("feedback.copy")}</Button>
            <Button asChild disabled={!idea.trim()}>
              <a href={mailto} onClick={() => setOpen(false)}><Send className="size-3.5" /> {t("feedback.send")}</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
