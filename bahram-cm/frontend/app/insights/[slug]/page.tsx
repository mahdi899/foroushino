import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, ChevronLeft, Clock } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { Reveal } from "@/components/motion/Reveal";
import { NewsletterCTA } from "@/components/sections/NewsletterCTA";
import { SiteImage } from "@/components/ui/SiteImage";
import { normalizeArticleSlugParam } from "@/lib/articleSlug";
import { getArticleBySlug, getArticles } from "@/lib/services/articles";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { resolveMediaUrl, rewriteArticleBodyMediaUrls } from "@/lib/mediaUrl";

export const revalidate = 300;

export async function generateStaticParams() {
  const result = await getArticles(1);
  if (!result.ok) return [];
  return result.data.items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeArticleSlugParam(rawSlug);
  const result = await getArticleBySlug(slug);
  if (!result.ok) return {};
  const post = result.data;
  return buildMetadata({
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || post.title,
    path: `/insights/${post.slug}`,
    image: post.featured_image ?? undefined,
    type: "article",
    noIndex: !post.is_indexable,
  });
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeArticleSlugParam(rawSlug);
  const result = await getArticleBySlug(slug);
  if (!result.ok) notFound();
  const post = result.data;

  if (post.slug !== slug) {
    redirect(`/insights/${encodeURIComponent(post.slug)}`);
  }

  const listResult = await getArticles(1);
  const related = listResult.ok
    ? listResult.data.items.filter((p) => p.slug !== post.slug).slice(0, 3)
    : [];

  const jsonLd = [
    articleJsonLd({
      title: post.title,
      description: post.excerpt || post.title,
      path: `/insights/${post.slug}`,
      datePublished: post.published_at ?? undefined,
      section: post.kicker ?? undefined,
    }),
    breadcrumbJsonLd([
      { name: "خانه", path: "/" },
      { name: "بلاگ", path: "/insights" },
      { name: post.kicker || "مقاله", path: `/insights/${post.slug}` },
    ]),
  ];

  const coverSrc = post.featured_image ? resolveMediaUrl(post.featured_image) : null;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="insight" slug={post.slug} />
      {post.canonical_url ? <link rel="canonical" href={post.canonical_url} /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate overflow-hidden bg-ink">
        {coverSrc ? (
          <div className="insight-hero-stage">
            <SiteImage
              src={coverSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              wrapperClassName="absolute inset-0 z-0 overflow-hidden"
              className="object-cover blur-lg brightness-50 saturate-75"
            />
            <div
              aria-hidden
              className="absolute inset-0 z-[1] bg-gradient-to-b from-ink/75 via-ink/92 to-ink"
            />
            <div className="insight-hero-stage-bottom-fade" aria-hidden />

            <div className="container-luxe relative z-[3] mx-auto max-w-4xl min-w-0 pt-section-sm">
              <Reveal>
                <nav aria-label="مسیر صفحه" className="insight-hero-breadcrumb">
                  <Link href="/insights" className="insight-hero-breadcrumb-link">
                    بلاگ
                  </Link>
                  <ChevronLeft className="insight-hero-breadcrumb-sep rtl-flip h-3.5 w-3.5" aria-hidden />
                  <span className="insight-hero-breadcrumb-current">{post.kicker || "مقاله"}</span>
                </nav>
              </Reveal>
            </div>

            <Reveal delay={0.08}>
              <div className="insight-hero-stage-content">
                <div className="insight-hero-stage-content-inner container-luxe mx-auto max-w-[45rem] min-w-0">
                  <h1 className="insight-hero-cover-title max-w-full min-w-0 text-h2 text-balance md:text-h1">
                    {post.title}
                  </h1>
                  {(post.published_at || post.reading_time) && (
                    <div className="insight-hero-meta mt-4 md:mt-5">
                      {post.published_at ? (
                        <time dateTime={post.published_at} className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                          {formatDateFa(post.published_at)}
                        </time>
                      ) : null}
                      {post.reading_time ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                          {post.reading_time}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        ) : (
          <div className="container-luxe relative z-[2] mx-auto max-w-4xl min-w-0 pb-8 pt-section-sm md:pb-10">
            <Reveal>
              <nav aria-label="مسیر صفحه" className="insight-hero-breadcrumb">
                <Link href="/insights" className="insight-hero-breadcrumb-link">
                  بلاگ
                </Link>
                <ChevronLeft className="insight-hero-breadcrumb-sep rtl-flip h-3.5 w-3.5" aria-hidden />
                <span className="insight-hero-breadcrumb-current">{post.kicker || "مقاله"}</span>
              </nav>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-4 max-w-full min-w-0 text-h2 text-balance text-bone sm:text-h1 md:mt-5 lg:text-display">
                {post.title}
              </h1>
            </Reveal>
            {(post.published_at || post.reading_time) && (
              <Reveal delay={0.14}>
                <div className="insight-hero-meta insight-hero-meta--page mt-7">
                  {post.published_at ? (
                    <time dateTime={post.published_at} className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                      {formatDateFa(post.published_at)}
                    </time>
                  ) : null}
                  {post.reading_time ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                      {post.reading_time}
                    </span>
                  ) : null}
                </div>
              </Reveal>
            )}
          </div>
        )}

        <div className="insight-hero-section-fade" aria-hidden />
      </section>

      <section className="py-section-sm">
        <div className="insight-article-wrap">
          <article
            className="prose-luxe insight-article-prose text-bone-dim"
            dangerouslySetInnerHTML={{ __html: rewriteArticleBodyMediaUrls(post.content) }}
          />
        </div>
      </section>

      {related.length > 0 ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <h2 className="text-h3 text-bone">مطالب مرتبط</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/insights/${item.slug}`}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    {item.featured_image ? (
                      <SiteImage
                        src={resolveMediaUrl(item.featured_image)}
                        alt={item.featured_image_alt}
                        fallbackAlt={item.title}
                        fill
                        sizes="33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <h3 className="text-h3 text-bone">{item.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <NewsletterCTA />
    </main>
  );
}
