import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { NewsletterCTA } from "@/components/sections/NewsletterCTA";
import { getArticles } from "@/lib/services/articles";
import { formatDateFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "مقالات",
  description: "یادداشت‌های تازه‌ی تیم؛ کمپین، رشد و اجرای حرفه‌ای.",
  path: "/articles",
});

export const revalidate = 300;

function ArticleCover({ src }: { src: string | null }) {
  if (!src) {
    return (
      <div
        aria-hidden
        className="h-full w-full bg-gradient-to-br from-emerald-deep/50 via-charcoal to-obsidian"
      />
    );
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
    />
  );
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const result = await getArticles(page);

  const items = result.ok ? result.data.items : [];
  const meta = result.ok ? result.data.meta : null;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero
        eyebrow="Articles"
        title="مقالات"
        description="یادداشت‌های تازه؛ از پیام تا اجرای کمپین."
      />

      <section className="py-section-sm">
        <div className="container-luxe">
          {items.length === 0 ? (
            <p className="text-center text-bone-dim">
              {result.ok ? "هنوز مقاله‌ای منتشر نشده است." : result.error}
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((post, i) => (
                <Reveal key={post.slug} delay={i * 0.06}>
                  <Link
                    href={`/articles/${post.slug}`}
                    className="neon-surface-hover group block h-full overflow-hidden rounded-card border border-bone/10 bg-charcoal/45 transition-colors hover:border-bone/25"
                  >
                    <div className="relative aspect-[3/2] overflow-hidden">
                      <ArticleCover src={post.featured_image} />
                    </div>
                    <div className="p-5 md:p-6">
                      <p className="inline-flex items-center gap-2 text-caption text-gold">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                        مقاله
                      </p>
                      <h3 className="mt-3 text-h3 text-balance text-bone">
                        {post.title}
                      </h3>
                      {post.excerpt ? (
                        <p className="mt-3 text-bone-dim">{post.excerpt}</p>
                      ) : null}
                      {post.published_at ? (
                        <div className="mt-6 flex items-center gap-1.5 text-caption text-mist">
                          <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          {formatDateFa(post.published_at)}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}

          {meta && meta.last_page > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-3">
              {page > 1 ? (
                <Link
                  href={`/articles?page=${page - 1}`}
                  className="inline-flex items-center gap-2 rounded-pill border border-bone/15 px-4 py-2 text-caption text-bone hover:border-bone/30"
                >
                  <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
                  قبلی
                </Link>
              ) : null}
              <span className="text-caption text-mist">
                صفحه {page.toLocaleString("fa-IR")} از {meta.last_page.toLocaleString("fa-IR")}
              </span>
              {page < meta.last_page ? (
                <Link
                  href={`/articles?page=${page + 1}`}
                  className="inline-flex items-center gap-2 rounded-pill border border-bone/15 px-4 py-2 text-caption text-bone hover:border-bone/30"
                >
                  بعدی
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180 rtl-flip" aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <NewsletterCTA />
    </main>
  );
}
