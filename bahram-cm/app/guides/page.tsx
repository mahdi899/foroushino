import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { getGuides } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "راهنماها",
  description:
    "راهنماهای گام‌به‌گام برای شروع برند شخصی، ساخت اولین کمپین، قیمت‌گذاری و سیستم محتوا.",
  path: "/guides",
});

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Guides"
        title="راهنماها"
        description="مسیرهای گام‌به‌گام برای حرکت از نقطه‌ی فعلی به قدم بعدی."
      />

      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-2">
            {guides.map((g, i) => (
              <Reveal key={g.slug} delay={(i % 2) * 0.06}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="neon-surface-hover group flex h-full flex-col rounded-card border border-bone/10 bg-charcoal/45 p-6 transition-colors hover:border-bone/25 md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-bone/15 bg-ink/50 text-gold">
                      <BookOpen className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    </span>
                    <Badge tone="neutral">{g.level}</Badge>
                  </div>
                  <h2 className="mt-5 text-h3 text-balance text-bone">{g.title}</h2>
                  <p className="mt-3 flex-1 text-bone-dim">{g.summary}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-gold">
                    خواندن راهنما
                    <ArrowLeft
                      className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
