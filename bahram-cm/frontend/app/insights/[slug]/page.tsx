import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { ServerInsertedJsonLd } from "@/components/bootstrap/ServerInsertedJsonLd";
import { InsightAdjacentLink } from "@/components/blog/InsightAdjacentLink";
import { InsightShareButton } from "@/components/blog/InsightShareButton";
import { Reveal } from "@/components/motion/Reveal";
import { NewsletterCTA } from "@/components/sections/NewsletterCTA";
import { SiteImage } from "@/components/ui/SiteImage";
import { normalizeArticleSlugParam } from "@/lib/articleSlug";
import { getArticleBySlug, getAllArticleSlugs, getArticles } from "@/lib/services/articles";
import { ArticleBodyContent } from "@/components/blog/ArticleBodyContent";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { resolveArticleHeroExcerpt } from "@/lib/blog/heroExcerpt";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

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
  const result = await getArticleBySlug(slug);
  if (!result.ok) notFound();
  const post = result.data;

  if (post.slug !== slug) {
    redirect(`/insights/${encodeURIComponent(post.slug)}`);
  }

  const listResult = await getArticles(1, 100);
  const articles = listResult.ok ? listResult.data.items : [];
  const currentIndex = articles.findIndex((item) => item.slug === post.slug);
  const adjacentPrev =
    currentIndex >= 0 && currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;
  const adjacentNext = currentIndex > 0 ? articles[currentIndex - 1] : null;

  const related = articles.filter((p) => p.slug !== post.slug).slice(0, 3);

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
      <ContentViewTracker type="insight" slug={post.slug} />
      {post.canonical_url ? <link rel="canonical" href={post.canonical_url} /> : null}
      <ServerInsertedJsonLd id={`jsonld-insight-${post.slug}`} data={jsonLd} />

      <section className="insight-hero-split-section">
        <div className="insight-hero-split container-luxe mx-auto max-w-6xl min-w-0">
          <div className="insight-hero-split__grid">
            {coverSrc ? (
              <Reveal delay={0.04} className="insight-hero-split__media-wrap">
                <figure className="insight-hero-split__media">
                  <SiteImage
                    src={coverSrc}
                    alt={post.featured_image_alt}
                    fallbackAlt={post.title}
                    fill
                    priority
                    sizes="(max-width: 1023px) 100vw, 42vw"
                    className="object-cover"
                  />
                </figure>
              </Reveal>
            ) : (
              <Reveal delay={0.04} className="insight-hero-split__media-wrap">
                <div
                  aria-hidden
                  className="insight-hero-split__media insight-hero-split__media--fallback"
                />
              </Reveal>
            )}

            <Reveal className="insight-hero-split__content">
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
                <InsightShareButton title={post.title} text={heroExcerpt} />
              </div>

              <header className="insight-hero-split__heading">
                <h1 className="insight-hero-split__title">
                  {post.title}
                </h1>
                {heroExcerpt ? (
                  <p className="insight-hero-split__excerpt">{heroExcerpt}</p>
                ) : null}
              </header>

              {adjacentPrev || adjacentNext ? (
                <nav aria-label="مقالات مجاور" className="insight-hero-adjacent-nav">
                  {adjacentNext ? (
                    <InsightAdjacentLink
                      href={`/insights/${adjacentNext.slug}`}
                      title={adjacentNext.title}
                      direction="next"
                    />
                  ) : (
                    <span className="insight-hero-adjacent insight-hero-adjacent--placeholder" aria-hidden />
                  )}
                  {adjacentPrev ? (
                    <InsightAdjacentLink
                      href={`/insights/${adjacentPrev.slug}`}
                      title={adjacentPrev.title}
                      direction="prev"
                    />
                  ) : (
                    <span className="insight-hero-adjacent insight-hero-adjacent--placeholder" aria-hidden />
                  )}
                </nav>
              ) : null}
            </Reveal>
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
                        src={item.featured_image}
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
