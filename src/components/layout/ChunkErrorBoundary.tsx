import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type Props = { children: ReactNode };
type State = { error: Error | null };

function isChunkLoadError(error: Error) {
  const message = error.message || "";
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Loading chunk")
  );
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Tool render error", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunkError = isChunkLoadError(error);

    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
          <div className="text-sm font-semibold">
            {chunkError ? "Cần tải lại phiên bản mới" : "Tool bị lỗi"}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {chunkError
              ? "Trình duyệt hoặc Cloudflare đang giữ file JS cũ sau khi deploy. Bấm tải lại để lấy bản mới nhất."
              : error.message}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" onClick={() => window.location.reload()}>
              Tải lại
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Xóa cache local
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
