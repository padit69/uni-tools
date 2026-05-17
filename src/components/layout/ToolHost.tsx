import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
  const tool = slug ? getToolBySlug(slug) : null;
  if (!tool) return <NotFound />;
  const Component = tool.Component;
  return (
    <ChunkErrorBoundary key={slug}>
      <Suspense fallback={<ToolLoading />}>
        <Component />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
