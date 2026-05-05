import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  text: string;
  label?: string;
  iconOnly?: boolean;
}

export function CopyButton({
  text,
  label = "Copy",
  iconOnly,
  className,
  variant = "ghost",
  size = "sm",
  disabled,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const Icon = copied ? Check : Copy;

  const handleClick = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Button
      variant={variant}
      size={iconOnly ? "icon" : size}
      onClick={handleClick}
      disabled={disabled || !text}
      className={cn(iconOnly ? "size-7" : "h-7 text-xs", className)}
      {...props}
    >
      <Icon className="size-3.5" />
      {!iconOnly && (copied ? "Đã copy" : label)}
    </Button>
  );
}
