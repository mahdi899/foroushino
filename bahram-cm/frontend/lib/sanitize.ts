import sanitizeHtml from 'sanitize-html';

const ARTICLE_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark',
  'sup', 'sub',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a',
  'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
  'figure', 'figcaption',
  'div', 'span',
  'video', 'source',
];

const ARTICLE_ALLOWED_ATTR: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'id', 'dir', 'lang', 'style'],
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
  video: ['src', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload', 'poster', 'width', 'height'],
  source: ['src', 'type'],
  th: ['scope', 'colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};

const ARTICLE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ARTICLE_ALLOWED_TAGS,
  allowedAttributes: ARTICLE_ALLOWED_ATTR,
  // Strip javascript: and data: hrefs
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        // Force external links to be safe
        rel: attribs.target === '_blank' ? 'noopener noreferrer' : (attribs.rel ?? ''),
      },
    }),
  },
};

/** Sanitize rich HTML from the CMS (articles, seminar descriptions, mini-course descriptions). */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, ARTICLE_OPTIONS);
}
