import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TransformationVoiceCard } from "@/components/transformations/TransformationVoiceCard";
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
              <TransformationVoiceCard
                item={{
                  slug: item.slug,
                  name: item.name,
                  role: item.role,
                  summary: item.oneLine,
                  body: "",
                  portraitSrc: caseStudyPortrait(item.slug),
                }}
                showMetric={false}
                scrim="bottom-half"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
