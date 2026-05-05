import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-6xl font-bold tracking-tight">404</p>
      <p className="text-[var(--muted-foreground)]">Tool này chưa có. Có thể bạn gõ nhầm slug?</p>
      <Link to="/">
        <Button variant="glass" className="mt-2">Về trang chủ</Button>
      </Link>
    </div>
  );
}
