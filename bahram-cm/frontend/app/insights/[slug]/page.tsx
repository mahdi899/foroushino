import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import {
  InsightNewsletterDeferred,
  InsightShareButtonLazy,
  InsightViewTracker,
} from "@/components/blog/InsightDeferredClient";
import {
  InsightAdjacentNav,
  InsightRelatedArticles,
} from "@/components/blog/InsightRelatedSection";
import { ServerInsertedJsonLd } from "@/components/bootstrap/ServerInsertedJsonLd";
import { ArticleBodyContent } from "@/components/blog/ArticleBodyContent";
import { SiteImage } from "@/components/ui/SiteImage";
import { normalizeArticleSlugParam } from "@/lib/articleSlug";
import { getArticleBySlug, getAllArticleSlugs } from "@/lib/services/articles";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { resolveArticleHeroExcerpt } from "@/lib/blog/heroExcerpt";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { ensureStaticPageCache } from "@/lib/cache/staticPage";

export async function generateStaticParams() {
  const items = await getAllArticleSlugs();
  return items.map((item) => ({ slug: item.slug }));
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

  const [, result] = await Promise.all([ensureStaticPageCache(), getArticleBySlug(slug)]);
  if (!result.ok) notFound();
  const post = result.data;

  if (post.slug !== slug) {
    redirect(`/insights/${encodeURIComponent(post.slug)}`);
  }

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

  const coverSrc = post.featured_image ?? null;
  const heroExcerpt = resolveArticleHeroExcerpt(post.excerpt, post.content, post.slug);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <InsightViewTracker slug={post.slug} />
      {post.canonical_url ? <link rel="canonical" href={post.canonical_url} /> : null}
      <ServerInsertedJsonLd id={`jsonld-insight-${post.slug}`} data={jsonLd} />

      <section className="insight-hero-split-section">
        <div className="insight-hero-split container-luxe mx-auto max-w-6xl min-w-0">
          <div className="insight-hero-split__grid">
            {coverSrc ? (
              <div className="insight-hero-split__media-wrap">
                <figure className="insight-hero-split__media">
                  <SiteImage
                    src={coverSrc}
                    alt={post.featured_image_alt}
                    fallbackAlt={post.title}
                    fill
                    priority
                    decoding="sync"
                    sizes="(max-width: 1023px) 100vw, 42vw"
                    className="object-cover"
                  />
                </figure>
              </div>
            ) : (
              <div className="insight-hero-split__media-wrap">
                <div
                  aria-hidden
                  className="insight-hero-split__media insight-hero-split__media--fallback"
                />
              </div>
            )}

            <div className="insight-hero-split__content">
              <div className="insight-hero-split__toolbar">
                <div className="insight-hero-split__meta-row">
                  <Link href="/insights" className="insight-hero-split__tag">
                    <span className="insight-hero-split__tag-dot" aria-hidden />
                    بلاگ
                  </Link>
                  {post.reading_time ? (
                    <span className="insight-hero-split__meta-item">
                      زمان مطالعه: {post.reading_time}
                    </span>
                  ) : null}
                  {post.published_at ? (
                    <time dateTime={post.published_at} className="insight-hero-split__meta-item">
                      {formatDateFa(post.published_at)}
                    </time>
                  ) : null}
                </div>
                <InsightShareButtonLazy title={post.title} text={heroExcerpt} />
              </div>

              <header className="insight-hero-split__heading">
                <h1 className="insight-hero-split__title">
                  {post.title}
                </h1>
                {heroExcerpt ? (
                  <p className="insight-hero-split__excerpt">{heroExcerpt}</p>
                ) : null}
              </header>

              <Suspense fallback={null}>
                <InsightAdjacentNav slug={post.slug} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="insight-article-wrap">
          <ArticleBodyContent
            html={post.content}
            className="prose-luxe insight-article-prose text-bone-dim"
          />
        </div>
      </section>

      <Suspense fallback={null}>
        <InsightRelatedArticles slug={post.slug} />
      </Suspense>

      <InsightNewsletterDeferred />
    </main>
  );
}
