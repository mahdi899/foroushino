import Image from 'next/image';
import Link from 'next/link';
import type { FamilyArticleBlock } from '@/lib/family/types';

export function ArticleBlock({ article }: { article: FamilyArticleBlock }) {
  return (
    <Link
      href={article.url}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
    >
      {article.thumbnail ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          <Image src={article.thumbnail} alt="" fill unoptimized className="object-cover" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-bone">{article.title}</p>
        {article.excerpt ? <p className="mt-0.5 line-clamp-2 text-xs text-bone/60">{article.excerpt}</p> : null}
      </div>
    </Link>
  );
}
