import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { useI18n } from "@/i18n";
import { getToolBySlug } from "@/tools/registry";
import NotFound from "@/pages/NotFound";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";

function ToolLoading() {
  return (
    <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

export function ToolHost() {
  const { slug } = useParams<{ slug: string }>();
  const { toolDesc, categoryLabel } = useI18n();
  const tool = slug ? getToolBySlug(slug) : null;
  if (!tool) return <NotFound />;
  const Component = tool.Component;
  const description = toolDesc(tool.id, tool.description);
  const keywords = [tool.name, ...tool.keywords, categoryLabel(tool.category), "Uni Tools"]
    .join(", ");

  return (
    <>
      <PageMeta
        title={tool.name}
        description={description}
        path={`/tools/${tool.slug}`}
        keywords={keywords}
      />
      <ChunkErrorBoundary key={slug}>
        <Suspense fallback={<ToolLoading />}>
          <Component />
        </Suspense>
      </ChunkErrorBoundary>
    </>
  );
}
