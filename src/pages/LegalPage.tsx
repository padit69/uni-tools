import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { useI18n } from "@/i18n";

type LegalKind = "policy" | "terms";

const sections: Record<LegalKind, Array<{ titleKey: string; descKey: string }>> = {
  policy: [
    { titleKey: "policy.scopeTitle", descKey: "policy.scopeDesc" },
    { titleKey: "policy.localTitle", descKey: "policy.localDesc" },
    { titleKey: "policy.networkTitle", descKey: "policy.networkDesc" },
    { titleKey: "policy.storageTitle", descKey: "policy.storageDesc" },
    { titleKey: "policy.feedbackTitle", descKey: "policy.feedbackDesc" },
    { titleKey: "policy.securityTitle", descKey: "policy.securityDesc" },
    { titleKey: "policy.contactTitle", descKey: "policy.contactDesc" },
  ],
  terms: [
    { titleKey: "terms.acceptanceTitle", descKey: "terms.acceptanceDesc" },
    { titleKey: "terms.useTitle", descKey: "terms.useDesc" },
    { titleKey: "terms.outputTitle", descKey: "terms.outputDesc" },
    { titleKey: "terms.thirdPartyTitle", descKey: "terms.thirdPartyDesc" },
    { titleKey: "terms.noWarrantyTitle", descKey: "terms.noWarrantyDesc" },
    { titleKey: "terms.liabilityTitle", descKey: "terms.liabilityDesc" },
    { titleKey: "terms.changesTitle", descKey: "terms.changesDesc" },
  ],
};

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { t } = useI18n();
  const titleKey = kind === "policy" ? "policy.title" : "terms.title";
  const subtitleKey = kind === "policy" ? "policy.subtitle" : "terms.subtitle";
  const alternate = kind === "policy"
    ? { to: "/terms", label: t("nav.terms") }
    : { to: "/policy", label: t("nav.policy") };

  const path = kind === "policy" ? "/policy" : "/terms";

  return (
    <>
      <PageMeta
        title={t(titleKey)}
        description={t(subtitleKey)}
        path={path}
        keywords={kind === "policy" ? "privacy policy, uni tools, data" : "terms of use, uni tools"}
      />
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 md:p-8">
        <section className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-1 text-xs text-[var(--muted-foreground)]">
              <FileText className="size-3.5 text-emerald-300" />
              tools.hihi.team
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{t(titleKey)}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] md:text-base">
              {t(subtitleKey)}
            </p>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">{t("legal.lastUpdated")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/info"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.035] px-3 py-2 text-sm transition hover:bg-white/[0.07]"
            >
              {t("nav.info")}
            </Link>
            <Link
              to={alternate.to}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.035] px-3 py-2 text-sm transition hover:bg-white/[0.07]"
            >
              {alternate.label}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <article className="space-y-7">
          {sections[kind].map((section) => (
            <section key={section.titleKey} className="border-b border-[var(--border)] pb-7 last:border-b-0 last:pb-0">
              <h2 className="text-base font-semibold">{t(section.titleKey)}</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-[var(--muted-foreground)]">{t(section.descKey)}</p>
            </section>
          ))}
        </article>
      </div>
    </div>
    </>
  );
}
