import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { NewsletterCTA } from "@/components/sections/NewsletterCTA";
import { Badge } from "@/components/ui/Badge";
import { SiteImage } from "@/components/ui/SiteImage";
import { getArticles } from "@/lib/services/articles";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "بلاگ",
  description: "کمپین، پیام، رشد حرفه‌ای — کوتاه و مستقیم؛ یادداشت‌های حرفه‌ای بهرام رستمی.",
  path: "/insights",
});

function ArticleCover({
  src,
  alt,
  title,
}: {
  src: string | null;
  alt?: string | null;
  title?: string;
}) {
  if (!src) {
    return (
      <div
        aria-hidden
        className="h-full w-full bg-gradient-to-br from-emerald-deep/50 via-charcoal to-obsidian"
      />
    );
  }
  return (
    <SiteImage
      src={src}
      alt={alt}
      fallbackAlt={title ? `کاور ${title}` : "کاور مقاله"}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
    />
  );
}

export default async function InsightsPage() {
  const result = await getArticles(1);
  const items = result.ok ? result.data.items : [];
  const [featured, ...rest] = items;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full pt-8 md:pt-10 lg:pt-12">
      {!result.ok ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <p className="text-center text-bone-dim">{result.error}</p>
          </div>
        </section>
      ) : null}

      {featured ? (
        <section className="py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Link
                href={`/insights/${featured.slug}`}
                className="neon-surface-hover group block overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
              >
                <div className="grid gap-0 md:grid-cols-12">
                  <div className="relative aspect-[3/2] md:col-span-7 md:aspect-auto">
                    <ArticleCover
                      src={featured.featured_image}
                      alt={featured.featured_image_alt}
                      title={featured.title}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col justify-center p-5 md:col-span-5 md:p-10">
                    <Badge tone="gold">برجسته</Badge>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-caption">
                      <span className="inline-flex items-center gap-2 text-gold">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                        مقاله
                      </span>
                      {featured.published_at ? (
                        <span className="inline-flex items-center gap-1.5 text-mist">
                          <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          {formatDateFa(featured.published_at)}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-h2 text-balance text-bone">{featured.title}</h2>
                    {featured.excerpt ? <p className="mt-4 text-bone-dim">{featured.excerpt}</p> : null}
                    <span className="mt-7 inline-flex items-center gap-2 text-gold">
                      ادامه‌ی مطلب
                      <ArrowLeft
                        className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className="py-section-sm">
        <div className="container-luxe">
          {rest.length === 0 && result.ok ? (
            <p className="text-center text-bone-dim">هنوز مقاله‌ای منتشر نشده است.</p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <Reveal key={post.slug} delay={i * 0.06}>
                  <Link
                    href={`/insights/${post.slug}`}
                    className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                  >
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <ArticleCover
                        src={post.featured_image}
                        alt={post.featured_image_alt}
                        title={post.title}
                      />
                    </div>
                    <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-caption">
                      <span className="inline-flex items-center gap-2 text-gold">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                        مقاله
                      </span>
                      {post.published_at ? (
                        <span className="inline-flex items-center gap-1.5 text-mist">
                          <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          {formatDateFa(post.published_at)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-h3 text-balance text-bone">{post.title}</h3>
                    {post.excerpt ? <p className="mt-3 text-bone-dim">{post.excerpt}</p> : null}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <NewsletterCTA />
    </main>
  );
}
