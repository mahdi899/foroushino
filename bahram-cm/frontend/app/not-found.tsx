import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { SectionMotif } from "@/components/ui/SectionMotif";
import { NotFoundAnimationSlot } from "@/components/errors/NotFoundAnimationSlot";

export default function NotFound() {
  return (
    <main id="main-content" className="relative min-h-[72vh] min-w-0 max-w-full">
      <section className="flex min-h-[72vh] items-center justify-center py-section">
        <div className="container-luxe flex justify-center">
          <div className="relative w-full max-w-xl text-center">
            <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-b from-emerald/10 via-transparent to-gold/10 blur-2xl" />

            <div className="neon-surface-static relative rounded-card border border-bone/10 bg-charcoal/45 px-6 py-8 md:px-10 md:py-12">
              <NotFoundAnimationSlot />
              <SectionMotif className="mb-5" />

              <p className="text-caption tracking-[0.2em] text-gold">خطای ۴۰۴</p>
              <h1 className="mt-3 text-h1 text-balance text-bone">این مسیر پیدا نشد</h1>
              <p className="mx-auto mt-4 max-w-md text-bone-dim">
                ممکن است آدرس تغییر کرده یا اشتباه وارد شده باشد. از صفحه‌ی اصلی می‌توانی
                دوباره مسیرت را شروع کنی.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <LinkButton href="/" withArrow>
                  بازگشت به خانه
                </LinkButton>
                <Link href="/insights" className="text-gold transition-colors hover:text-gold-soft">
                  رفتن به بلاگ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
