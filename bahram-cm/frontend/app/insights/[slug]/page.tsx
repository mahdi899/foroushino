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
import { resolveMediaUrl } from "@/lib/mediaUrl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="insight" slug={post.slug} />
      {post.canonical_url ? <link rel="canonical" href={post.canonical_url} /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate overflow-hidden bg-ink">
        {post.featured_image ? (
          <div aria-hidden className="absolute inset-0 opacity-60">
            <SiteImage
              src={resolveMediaUrl(post.featured_image)}
              alt={post.featured_image_alt}
              fallbackAlt={post.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/70 to-ink" />
          </div>
        ) : null}
        <div className="container-luxe relative z-[2] max-w-4xl min-w-0 py-section-sm">
          <Reveal>
            <nav
              aria-label="مسیر صفحه"
              className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption"
            >
              <Link
                href="/insights"
                className="shrink-0 text-gold transition-colors hover:text-gold-soft"
              >
                بلاگ
              </Link>
              <ChevronLeft className="rtl-flip h-3.5 w-3.5 shrink-0 text-mist/50" aria-hidden />
              <span className="min-w-0 truncate text-mist">{post.kicker || "مقاله"}</span>
            </nav>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance text-bone md:mt-5 md:text-display">
              {post.title}
            </h1>
          </Reveal>
          {(post.published_at || post.reading_time) && (
            <Reveal delay={0.14}>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-mist">
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
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <div className="flex flex-col gap-8 md:gap-10">
            {post.featured_image ? (
              <Reveal delay={0.06}>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/40">
                  <SiteImage
                    src={resolveMediaUrl(post.featured_image)}
                    alt={post.featured_image_alt}
                    fallbackAlt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                    priority
                  />
                </div>
              </Reveal>
            ) : null}
            <article
              className="prose-luxe text-bone-dim"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
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
