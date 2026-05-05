import { cn } from "@/lib/cn";

interface ToolLayoutProps {
  title?: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Khung chuẩn cho 1 tool: header (title + toolbar) + body scroll-y.
 * Dùng để giữ visual nhất quán giữa các tool.
 */
export function ToolLayout({ title, subtitle, toolbar, children, className }: ToolLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {(title || toolbar) && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
            )}
            {subtitle && (
              <p className="truncate text-xs text-[var(--muted-foreground)]">{subtitle}</p>
            )}
          </div>
          {toolbar && <div className="flex shrink-0 items-center gap-2">{toolbar}</div>}
        </div>
      )}
      <div className={cn("min-h-0 flex-1 overflow-auto", className)}>{children}</div>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
        {hint && <span className="text-[10px] text-[var(--muted-foreground)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function ResultBox({
  value,
  label,
  className,
  mono = true,
  empty = "—",
}: {
  value: string;
  label?: string;
  className?: string;
  mono?: boolean;
  empty?: string;
}) {
  return (
    <div className={cn("group relative rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 pr-10", className)}>
      {label && (
        <div className="mb-1 text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          {label}
        </div>
      )}
      <div className={cn("min-h-5 break-all text-sm", mono && "font-mono", !value && "text-[var(--muted-foreground)]")}>
        {value || empty}
      </div>
    </div>
  );
}
