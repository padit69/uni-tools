import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { PageMeta } from "@/components/seo/PageMeta";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <PageMeta
        title="404"
        description={t("notFound.message")}
        noindex
      />
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-6xl font-bold tracking-tight">404</p>
      <p className="text-[var(--muted-foreground)]">{t("notFound.message")}</p>
      <Link to="/">
        <Button variant="glass" className="mt-2">{t("notFound.home")}</Button>
      </Link>
    </div>
    </>
  );
}
