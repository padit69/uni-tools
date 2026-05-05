import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const GlassCard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("glass rounded-2xl", className)}
      {...props}
    />
  )
);
GlassCard.displayName = "GlassCard";
