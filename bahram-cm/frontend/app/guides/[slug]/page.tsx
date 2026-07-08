import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { MdxBody } from "@/components/mdx/MdxBody";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { getGuideBySlug, getGuides } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const items = await getGuides();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getGuideBySlug(slug);
  if (!item) return {};
  return buildMetadata({
    title: item.title,
    description: item.summary,
    path: `/guides/${item.slug}`,
    type: "article",
  });
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getGuideBySlug(slug);
  if (!item) notFound();

  const all = await getGuides();
  const related = all.filter((g) => g.slug !== slug).slice(0, 2);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="guide" slug={item.slug} />
      <section className="page-hero relative overflow-hidden bg-ink">
        <div className="page-hero__mesh" aria-hidden />
        <div className="container-luxe page-hero__container max-w-3xl min-w-0">
          <Reveal>
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              راهنماها
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-6">
              <Badge tone="gold">{item.level}</Badge>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-4 text-h1 text-balance">{item.title}</h1>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-5 max-w-2xl text-bone-dim">{item.summary}</p>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <article className="prose-luxe text-bone-dim">
            <MdxBody source={item.body} />
          </article>

          <div className="mt-12 rounded-card border border-bone/10 bg-charcoal/40 p-6 md:p-8">
            <h2 className="text-h3 text-balance">آماده‌ی قدم بعدی هستی؟</h2>
            <p className="mt-3 text-bone-dim">
              مسیر کامل را در آکادمی و دوره‌ی کمپین‌نویسی ادامه بده.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <LinkButton href="/courses" variant="primary" withArrow>
                دیدن دوره‌ها
              </LinkButton>
              <LinkButton href="/apply" variant="primary">
                درخواست عضویت
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">راهنماهای مرتبط</p>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="neon-surface-hover group block h-full rounded-card border border-bone/10 bg-charcoal/45 p-6 transition-colors hover:border-bone/25"
                >
                  <Badge tone="neutral">{g.level}</Badge>
                  <h3 className="mt-3 text-h3 text-balance text-bone">{g.title}</h3>
                  <p className="mt-2 text-bone-dim">{g.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
