import { Sparkles, Clock, Lock } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconLabel } from "@/components/ui/IconLabel";
import { NewsletterForm } from "@/components/ui/NewsletterForm";

export function NewsletterCTA() {
  return (
    <section className="py-section">
      <div className="container-luxe">
        <div className="neon-surface-static relative overflow-hidden rounded-card border border-bone/10 bg-charcoal/40 p-8 md:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_10%,rgba(0,140,150,0.18),transparent_70%)]"
          />
          <div className="relative grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <Reveal>
                <Eyebrow>یادداشت‌های هفتگی</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-5 text-h2 text-balance">
                  هر هفته یک نگاه تازه، مستقیم در صندوق ایمیلت.
                </h2>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-4 max-w-xl text-bone-dim">
                  بدون تبلیغ، بدون اسپم، بدون قول‌های توخالی. فقط مشاهده‌های حرفه‌ای از جنس کمپین، مسیر و رشد.
                </p>
              </Reveal>
              <Reveal delay={0.22}>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                  <IconLabel icon={Sparkles} tone="emerald">
                    تحلیل‌های انحصاری
                  </IconLabel>
                  <IconLabel icon={Clock} tone="bone">
                    یک‌بار در هفته
                  </IconLabel>
                  <IconLabel icon={Lock} tone="gold">
                    حریم خصوصی کامل
                  </IconLabel>
                </div>
              </Reveal>
            </div>
            <div className="md:col-span-5">
              <Reveal delay={0.12}>
                <NewsletterForm />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
