import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="container-luxe relative flex min-h-[60vh] min-w-0 max-w-full flex-col items-start justify-center gap-6 py-section"
    >
      <p className="text-caption tracking-[0.2em] text-gold">404</p>
      <h1 className="text-h1 text-balance">این مسیر پیدا نشد.</h1>
      <p className="max-w-xl text-bone-dim">
        ممکن است آدرس تغییر کرده باشد. از صفحه‌ی اصلی می‌توانی دوباره مسیرت را
        شروع کنی.
      </p>
      <div className="flex gap-3">
        <LinkButton href="/" withArrow>
          بازگشت به خانه
        </LinkButton>
        <Link href="/insights" className="text-gold hover:text-gold-soft">
          رفتن به بلاگ
        </Link>
      </div>
    </main>
  );
}
