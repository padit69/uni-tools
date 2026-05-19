import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Globe2,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageMeta } from "@/components/seo/PageMeta";
import { useI18n } from "@/i18n";
import { useInstallApp } from "@/components/layout/InstallAppButton";

export default function Info() {
  const { t } = useI18n();
  const installApp = useInstallApp();
  const installAvailable = installApp.canInstall || installApp.canShowIosHint;

  return (
    <>
      <PageMeta
        title={t("info.title")}
        description={t("info.subtitle")}
        path="/info"
        keywords="uni tools, install pwa, developer tools, privacy"
      />
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-8">
        <section className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>

            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{t("info.title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] md:text-base">
              {t("info.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge icon={<ShieldCheck className="size-3.5" />}>{t("info.localBadge")}</Badge>
            <Badge icon={<Smartphone className="size-3.5" />}>{t("info.pwaBadge")}</Badge>
            <Badge icon={<Globe2 className="size-3.5" />}>{t("info.domainBadge")}</Badge>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-emerald-300">
                <Smartphone className="size-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{t("info.appTitle")}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">{t("info.appDesc")}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <InstallStep index="01" title={t("info.installStep1Title")} text={t("info.installStep1Desc")} />
              <InstallStep index="02" title={t("info.installStep2Title")} text={t("info.installStep2Desc")} />
              <InstallStep index="03" title={t("info.installStep3Title")} text={t("info.installStep3Desc")} />
            </div>
          </div>

          <aside className="rounded-xl border border-[var(--border)] bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  {t("info.status")}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{t("info.installCta")}</h2>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-[var(--muted)]">
                <Download className="size-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
              {installAvailable ? t("install.available") : t("install.notAvailable")}
            </p>
            <Button onClick={installApp.install} disabled={installApp.installed} className="mt-5 w-full">
              <Download className="size-4" />
              {t("info.installCta")}
            </Button>
          </aside>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <FeatureRow icon={<ShieldCheck className="size-5" />} title={t("info.privacyTitle")} text={t("info.privacyDesc")} />
          <FeatureRow icon={<Zap className="size-5" />} title={t("info.offlineTitle")} text={t("info.offlineDesc")} />
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <DocLink to="/policy" title={t("policy.title")} desc={t("info.policyDesc")} />
          <DocLink to="/terms" title={t("terms.title")} desc={t("info.termsDesc")} />
        </section>
      </div>
    </div>
    </>
  );
}

function Badge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
      {icon}
      {children}
    </span>
  );
}

function InstallStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/35 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-xs text-emerald-300">{index}</span>
        <CheckCircle2 className="size-4 text-emerald-300" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{text}</p>
    </div>
  );
}

function FeatureRow({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-xl border border-[var(--border)] bg-white/[0.035] p-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--muted)] text-[var(--foreground)]">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{text}</p>
      </div>
    </div>
  );
}

function DocLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-white/[0.035] p-4 transition hover:bg-white/[0.07]"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--muted)]">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{desc}</p>
      </div>
      <ArrowRight className="size-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
