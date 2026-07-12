'use client';

import { ArticleVideoEmbed } from '@/components/blog/ArticleVideoEmbed';
import { splitArticleBodyHtml } from '@/lib/article/videoEmbed';
import { rewriteArticleBodyMediaUrls } from '@/lib/mediaUrl';
import { sanitizeRichHtml } from '@/lib/sanitize';

interface ArticleBodyContentProps {
  html: string;
  className?: string;
}

/** Renders article HTML with interactive video embeds (Aparat / YouTube / direct). */
export function ArticleBodyContent({ html, className }: ArticleBodyContentProps) {
  const prepared = sanitizeRichHtml(rewriteArticleBodyMediaUrls(html));
  const parts = splitArticleBodyHtml(prepared);

  if (parts.length === 1 && parts[0].type === 'html') {
    return (
      <article
        className={className}
        dangerouslySetInnerHTML={{ __html: parts[0].content }}
      />
    );
  }

  return (
    <article className={className}>
      {parts.map((part, index) =>
        part.type === 'video' ? (
          <ArticleVideoEmbed key={`video-${index}`} {...part.attrs} />
        ) : part.content.trim() ? (
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: part.content }}
          />
        ) : null,
      )}
    </article>
  );
}
