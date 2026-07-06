import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Quote } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { MdxBody } from "@/components/mdx/MdxBody";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SiteImage } from "@/components/ui/SiteImage";
import { getTransformationBySlug, getTransformations } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { resolveMediaAlt } from "@/lib/media/alt";
import { caseStudyPortrait, pageHeroBackdropPhoto } from "@/lib/site-photo-paths";

export async function generateStaticParams() {
  const items = await getTransformations();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getTransformationBySlug(slug);
  if (!item) return {};
  return buildMetadata({
    title: `داستان ${item.name}`,
    description: item.summary,
    path: `/transformations/${item.slug}`,
    type: "article",
  });
}

export default async function TransformationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getTransformationBySlug(slug);
  if (!item) notFound();

  const avatar = caseStudyPortrait(item.slug);
  const heroAlt = await resolveMediaAlt(pageHeroBackdropPhoto, `داستان ${item.name}`);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="transformation" slug={item.slug} />
      <section className="relative isolate overflow-hidden bg-ink py-section-sm">
        <div aria-hidden className="absolute inset-0">
          <SiteImage
            src={pageHeroBackdropPhoto}
            alt={heroAlt}
            fallbackAlt={`داستان ${item.name}`}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/72 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] max-w-4xl min-w-0">
          <Reveal>
            <Link
              href="/transformations"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              رضایت دانشجوها
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <Badge tone="gold" className="mt-6 md:mt-8">داستان تبدیل</Badge>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-5 flex flex-wrap items-center gap-4 md:mt-6 md:gap-5">
              <Avatar src={avatar} alt={item.name} size={84} className="max-md:scale-90" />
              <div className="min-w-0">
                <h1 className="text-h1 text-balance md:text-display">{item.name}</h1>
                <p className="mt-2 text-gold">{item.role}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-4xl min-w-0">
          <Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="neon-surface-static rounded-card border border-bone/10 bg-charcoal/40 p-5 md:p-6">
                <p className="text-caption uppercase tracking-[0.25em] text-mist">قبل از مسیر</p>
                <p className="mt-3 text-bone-dim">{item.before}</p>
              </div>
              <div className="neon-surface-static rounded-card border border-emerald/25 bg-emerald-deep/30 p-5 md:p-6" data-neon-tone="emerald">
                <p className="text-caption uppercase tracking-[0.25em] text-emerald-glow">بعد از مسیر</p>
                <p className="mt-3 text-bone">{item.after}</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <Quote className="mt-8 h-8 w-8 text-gold/50 md:mt-12" strokeWidth={1.4} aria-hidden />
          </Reveal>
          <article className="prose-luxe mt-4 text-bone-dim">
            <MdxBody source={item.body} />
          </article>

          <div className="mt-10 rounded-card border border-bone/10 bg-charcoal/40 p-5 text-center md:mt-14 md:p-7 lg:p-10">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">آماده‌ی مسیر خودت هستی؟</p>
            <h2 className="mt-3 text-h2 text-balance">مسیر همین‌جا شروع می‌شود.</h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <LinkButton href="/course/campaign-writing" variant="primary" size="lg" withArrow>
                شروع از کمپین‌نویسی
              </LinkButton>
              <Link
                href="/transformations"
                className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
              >
                مسیرهای بیشتر دانشجوها
                <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
