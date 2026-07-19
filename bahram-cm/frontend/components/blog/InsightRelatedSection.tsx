import Link from 'next/link';
import { cache } from 'react';
import { InsightAdjacentLink } from '@/components/blog/InsightAdjacentLink';
import { SiteImage } from '@/components/ui/SiteImage';
import { getArticles, type ArticleListItem } from '@/lib/services/articles';

function pickAdjacent(articles: ArticleListItem[], slug: string) {
  const currentIndex = articles.findIndex((item) => item.slug === slug);
  const adjacentPrev =
    currentIndex >= 0 && currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;
  const adjacentNext = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const related = articles.filter((item) => item.slug !== slug).slice(0, 3);

  return { adjacentPrev, adjacentNext, related };
}

const loadArticleList = cache(async () => {
  const listResult = await getArticles(1, 24);
  return listResult.ok ? listResult.data.items : [];
});

/** Adjacent prev/next — streamed after hero via Suspense (does not block TTFB). */
export async function InsightAdjacentNav({ slug }: { slug: string }) {
  const articles = await loadArticleList();
  const { adjacentPrev, adjacentNext } = pickAdjacent(articles, slug);

  if (!adjacentPrev && !adjacentNext) return null;

  return (
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
  );
}

/** Related cards — below the fold, streamed separately from article body. */
export async function InsightRelatedArticles({ slug }: { slug: string }) {
  const articles = await loadArticleList();
  const { related } = pickAdjacent(articles, slug);

  if (related.length === 0) return null;

  return (
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
  );
}
