import { Reveal } from '@/components/motion/Reveal';
import {
  SatPublicApplicationForm,
  type SatPublicApplicationStatus,
} from '@/components/forms/SatPublicApplicationForm';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function SatApplySection({
  application,
}: {
  application?: SatPublicApplicationStatus | null;
}) {
  return (
    <section
      id="apply"
      aria-labelledby="saat-apply-heading"
      className="scroll-mt-20 border-t border-gold/15 bg-ink py-section-sm md:py-section"
    >
      <div className="container-luxe">
        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
                درخواست ورود
              </Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 id="saat-apply-heading" className="mt-5 text-h3 text-bone md:text-h2">
                فرم درخواست سات
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-bone-dim md:text-base">
                اگر فروش را جدی می‌گیری، درخواستت را ثبت کن. تیم ما بررسی می‌کند و نتیجه را از
                پنل و پیامک اعلام می‌کند.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <ol className="mt-6 space-y-3 text-sm text-bone-dim">
                <li className="flex gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-gold/30 bg-gold/[0.1] text-xs text-gold">
                    ۱
                  </span>
                  <span>فرم را تکمیل کن</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-gold/30 bg-gold/[0.1] text-xs text-gold">
                    ۲
                  </span>
                  <span>تیم آکادمی درخواست را بررسی می‌کند</span>
                </li>
                <li className="flex gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-gold/30 bg-gold/[0.1] text-xs text-gold">
                    ۳
                  </span>
                  <span>در صورت پذیرش، مسیر ورود فعال می‌شود</span>
                </li>
              </ol>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="lg:col-span-7">
            <SatPublicApplicationForm application={application} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
