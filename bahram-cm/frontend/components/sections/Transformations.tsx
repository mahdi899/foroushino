import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TransformationVoiceCard } from "@/components/transformations/TransformationVoiceCard";
import { site } from "@/content/site";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

const items = site.transformations.map((item) => ({
  ...item,
  portraitSrc: caseStudyPortrait(item.slug),
}));

export function Transformations() {
  return (
    <section className="bg-obsidian py-section">
      <div className="container-luxe">
        <Reveal>
          <Eyebrow>رضایت دانشجوها</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-5 max-w-3xl text-h2 text-balance">
            به زبان خودشان — نه خلاصهٔ بازاریابی.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 max-w-2xl text-bone-dim">
            عکس و جمله‌ای که خود دانشجو گفته؛ چهار نمونه از کسانی که مسیر را جدی گرفتند.
          </p>
        </Reveal>

        <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:mt-12 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-4 lg:gap-6">
          {items.map((item, idx) => (
            <Reveal
              key={item.slug}
              delay={idx * 0.07}
              className="min-w-[78%] snap-start sm:min-w-[62%] md:min-w-0"
            >
              <TransformationVoiceCard
                item={{
                  slug: item.slug,
                  name: item.name,
                  role: item.role,
                  summary: item.oneLine,
                  body: "",
                  metricLabel: item.metricLabel,
                  metricValue: item.metricValue,
                  portraitSrc: item.portraitSrc,
                }}
              />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <Link
            href="/transformations"
            className="mt-8 inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft md:mt-10"
          >
            همهٔ نظرها
            <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
