import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Pencil } from "lucide-react";
import { ContentViewTracker } from "@/components/analytics/ContentViewTracker";
import { MdxBody } from "@/components/mdx/MdxBody";
import { Reveal } from "@/components/motion/Reveal";
import { getInsightBySlug, getInsights } from "@/lib/content";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { insightCoverPhotos } from "@/lib/site-photo-paths";

const covers = insightCoverPhotos;

export async function generateStaticParams() {
  const items = await getInsights();
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getInsightBySlug(slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/insights/${post.slug}`,
    type: "article",
  });
}

function readTime(body: string) {
  const wpm = 220;
  const words = body.split(/\s+/).filter(Boolean).length;
  const min = Math.max(2, Math.round(words / wpm));
  return `${min.toLocaleString("fa-IR")} دقیقه مطالعه`;
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getInsightBySlug(slug);
  if (!post) notFound();

  const all = await getInsights();
  const idx = all.findIndex((p) => p.slug === slug);
  const cover = covers[idx % covers.length]!;
  const related = all.filter((p) => p.slug !== slug).slice(0, 3);

  const jsonLd = [
    articleJsonLd({
      title: post.title,
      description: post.excerpt,
      path: `/insights/${post.slug}`,
      datePublished: post.date,
      section: post.kicker,
    }),
    breadcrumbJsonLd([
      { name: "خانه", path: "/" },
      { name: "بلاگ", path: "/insights" },
      { name: post.title, path: `/insights/${post.slug}` },
    ]),
  ];

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <ContentViewTracker type="insight" slug={post.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0 opacity-60">
          <Image src={cover} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/70 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] max-w-4xl min-w-0 py-section-sm">
          <Reveal>
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              بلاگ
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-6 inline-flex items-center gap-2 text-caption uppercase tracking-[0.25em] text-gold md:mt-8">
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
              {post.kicker}
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance md:mt-5 md:text-display">
              {post.title}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-mist">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {formatDateFa(post.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {readTime(post.body)}
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe max-w-3xl min-w-0">
          <article className="prose-luxe text-bone-dim">
            <MdxBody source={post.body} />
          </article>

          <div className="mt-12 rounded-card border border-bone/10 bg-charcoal/40 p-6 md:p-8">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">قدم بعدی</p>
            <h2 className="mt-3 text-h3 text-balance">از خواندن به ساختن.</h2>
            <p className="mt-3 text-bone-dim">
              این نگاه را در مسیرهای عملی آکادمی پیاده کن.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-gold">
              <Link href="/courses" className="inline-flex items-center gap-2 hover:text-gold-soft">
                دیدن دوره‌ها
                <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              </Link>
              <Link href="/guides" className="inline-flex items-center gap-2 hover:text-gold-soft">
                راهنماهای گام‌به‌گام
                <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="bg-obsidian py-section-sm">
          <div className="container-luxe">
            <p className="text-caption uppercase tracking-[0.25em] text-gold">مطالب مرتبط</p>
            <h2 className="mt-4 text-h2 text-balance">چند پیشنهاد خواندن بعدی.</h2>
            <div className="mt-7 grid gap-5 md:mt-10 md:grid-cols-3">
              {related.map((post, i) => (
                <Link
                  key={post.slug}
                  href={`/insights/${post.slug}`}
                  className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                >
                  <div className="relative aspect-[3/2]">
                    <Image
                      src={covers[(i + idx + 1) % covers.length]!}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-caption text-gold">{post.kicker}</p>
                    <h3 className="mt-3 text-h3 text-balance">{post.title}</h3>
                    <p className="mt-3 text-bone-dim">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
