import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { TransformationVoiceCard } from "@/components/transformations/TransformationVoiceCard";
import { getTransformations } from "@/lib/content";
import { caseStudyPortrait } from "@/lib/site-photo-paths";

function portraitSrc(item: { slug: string }) {
  return caseStudyPortrait(item.slug);
}

export const metadata: Metadata = buildMetadata({
  title: "رضایت دانشجوها",
  description: "نظر واقعی دانشجوها به زبان خودشان — بدون ژست بازاریابی.",
  path: "/transformations",
});

export default async function TransformationsPage() {
  const cases = await getTransformations();

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="رضایت دانشجوها"
        title="به زبان خودشان"
        description="عکس و حرف واقعی — نه خلاصهٔ بازاریابی."
      />
      <section className="py-section-sm">
        <div className="container-luxe">
          {cases.length === 0 ? (
            <p className="text-center text-bone-dim">هنوز نظری ثبت نشده است.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-7">
              {cases.map((item, i) => (
                <Reveal key={item.slug} delay={i * 0.06}>
                  <TransformationVoiceCard
                    item={{
                      slug: item.slug,
                      name: item.name,
                      role: item.role,
                      summary: item.summary,
                      body: item.body,
                      metricLabel: item.metricLabel,
                      metricValue: item.metricValue,
                      portraitSrc: portraitSrc(item),
                    }}
                    priority={i < 2}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
