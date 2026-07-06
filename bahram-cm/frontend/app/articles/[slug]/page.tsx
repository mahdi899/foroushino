import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { Reveal } from "@/components/motion/Reveal";
import { NewsletterCTA } from "@/components/sections/NewsletterCTA";
import { SiteImage } from "@/components/ui/SiteImage";
import { getArticleBySlug } from "@/lib/services/articles";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArticleBySlug(slug);
  if (!result.ok) return {};
  const post = result.data;

  return buildMetadata({
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || post.title,
    path: `/articles/${post.slug}`,
    image: post.featured_image ?? undefined,
    type: "article",
    noIndex: !post.is_indexable,
  });
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getArticleBySlug(slug);
  if (!result.ok) notFound();

  const post = result.data;

  const jsonLd = [
    articleJsonLd({
      title: post.title,
      description: post.excerpt || post.title,
      path: `/articles/${post.slug}`,
      datePublished: post.published_at ?? undefined,
    }),
    breadcrumbJsonLd([
      { name: "خانه", path: "/" },
      { name: "مقالات", path: "/articles" },
      { name: post.title, path: `/articles/${post.slug}` },
    ]),
  ];

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="article" slug={post.slug} />
      {post.canonical_url ? (
        <link rel="canonical" href={post.canonical_url} />
      ) : null}
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
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              مقالات
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-6 inline-flex items-center gap-2 text-caption uppercase tracking-[0.25em] text-gold md:mt-8">
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              مقاله
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance md:mt-5 md:text-display">
              {post.title}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-mist">
              {post.published_at ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  {formatDateFa(post.published_at)}
                </span>
              ) : null}
              {post.author ? <span>{post.author}</span> : null}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <article
            className="prose-luxe text-bone-dim"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </section>

      <NewsletterCTA />
    </main>
  );
}
