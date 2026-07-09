import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SiteImage } from "@/components/ui/SiteImage";
import { site } from "@/content/site";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

export function CampaignWritingSocialProof() {
  return (
    <section className="py-10 md:py-section-sm lg:py-section">
      <div className="container-luxe min-w-0">
        <Reveal>
          <Eyebrow>نتایج دانشجوها</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">
            تغییر واقعی، نه فقط حس خوب
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone-dim md:text-body">
            {site.studentResults.lead}
          </p>
        </Reveal>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 sm:gap-5 md:mt-10 lg:grid-cols-4 lg:gap-6">
          {site.transformations.map((item, i) => (
            <Reveal key={item.slug} delay={i * 0.06}>
              <article className="neon-surface-hover flex h-full flex-col overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/45">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SiteImage
                    src={caseStudyPortrait(item.slug)}
                    alt={`${item.name} — دانشجوی دوره کمپین‌نویسی`}
                    fallbackAlt={`پرتره ${item.name}`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 88vw, (max-width: 1024px) 46vw, 280px"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-sm font-semibold text-bone">{item.name}</p>
                    <p className="text-caption text-gold">{item.role}</p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <div className="rounded-card border border-bone/8 bg-ink/40 p-3">
                    <p className="text-caption tracking-wide text-mist">قبل</p>
                    <p className="mt-1 text-sm leading-relaxed text-bone-dim">{item.before}</p>
                  </div>
                  <div className="flex justify-center text-mist" aria-hidden>
                    <ArrowLeft className="rtl-flip h-4 w-4 rotate-90" strokeWidth={1.6} />
                  </div>
                  <div
                    data-neon-tone="emerald"
                    className="rounded-card border border-emerald/25 bg-emerald-deep/15 p-3"
                  >
                    <p className="text-caption tracking-wide text-emerald-glow">بعد</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-bone">{item.after}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
