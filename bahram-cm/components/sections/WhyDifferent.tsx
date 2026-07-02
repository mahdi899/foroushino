import { Check, X } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";

const rows: { left: string; right: string }[] = [
  { left: "آموزش پراکنده در شبکه‌های اجتماعی", right: "مسیر ساختاریِ ده‌فصلی" },
  { left: "محتوای انفعالی و رهاشده", right: "کمپین زنده با منتورینگ" },
  { left: "تبلیغات هیجانی و قول‌های بزرگ", right: "تمرکز بر هویت و اجرا" },
  { left: "ابزارهای پراکنده برای اجرا", right: "یک اپ خصوصی برای کل مسیر" },
  { left: "دانشجوی تنها و کم‌صدا در مسیر", right: "تیم رشد، صدا و همراهی" },
];

export function WhyDifferent() {
  return (
    <section className="bg-obsidian py-section-sm md:py-section">
      <div className="container-luxe">
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>چرا با بقیه فرق دارد</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 text-h2 text-balance md:mt-6">
              نه آموزش‌فروشی؛ مسیر تبدیل.
            </h2>
          </Reveal>
        </div>

        <div className="neon-surface-framed mt-10 overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/40 md:mt-16">
          <div className="grid grid-cols-1 border-b border-bone/8 md:grid-cols-2">
            <div className="p-5 text-bone-dim md:p-9">
              <p className="text-caption uppercase tracking-[0.3em] text-mist">معمول</p>
              <p className="mt-2 font-display text-base font-semibold leading-snug text-bone md:mt-3 md:text-xl">
                مدل‌های آموزشی رایج
              </p>
            </div>
            <div className="relative border-t border-bone/8 bg-gradient-to-br from-gold/[0.09] via-gold/[0.02] to-transparent p-5 md:border-s md:border-t-0 md:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_100%_0%,color-mix(in_oklab,var(--color-gold)_14%,transparent),transparent_65%)]"
              />
              <p className="relative text-caption uppercase tracking-[0.3em] text-gold">مسیر آکادمی</p>
              <p className="relative mt-2 font-display text-base font-semibold leading-snug text-bone md:mt-3 md:text-xl">
                اکوسیستم خصوصی
              </p>
            </div>
          </div>

          {rows.map((r, i) => (
            <Reveal key={r.left} delay={i * 0.04}>
              <div className="grid grid-cols-1 border-b border-bone/6 last:border-b-0 md:grid-cols-2">
                <div className="flex items-start gap-3 p-4 text-bone-dim md:gap-4 md:p-7">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-bone/12 text-mist md:h-9 md:w-9">
                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.6} aria-hidden />
                  </span>
                  <p className="text-sm leading-relaxed md:text-base">{r.left}</p>
                </div>
                <div className="flex items-start gap-3 border-t border-bone/6 p-4 text-bone md:gap-4 md:border-s md:border-t-0 md:p-7">
                  <span className="well-emerald-chip mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-emerald-deep/50 ring-1 ring-emerald/30 text-emerald-glow md:h-9 md:w-9">
                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <p className="text-sm font-medium leading-relaxed md:text-base">{r.right}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
