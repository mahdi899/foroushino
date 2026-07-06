/** Draft snapshot stored as an article revision (git-like commit). */
export interface ArticleRevisionSnapshot {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_url: string;
  reading_time: string;
  status: string;
  category_id: number | null;
  focus_keyword?: string | null;
  seo: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
  };
}

export interface ApiArticleRevision {
  id: number;
  revision_number: number;
  label: string;
  created_at: string;
  author?: string | null;
  is_manual?: boolean;
  snapshot?: ArticleRevisionSnapshot;
}

export const ARTICLE_AUTOSAVE_DEBOUNCE_MS = 30 * 1000;
export const ARTICLE_MAX_AUTOSAVES = 10;
/** @deprecated use ARTICLE_MAX_AUTOSAVES for autosave cap; manual commits are kept separately */
export const ARTICLE_MAX_REVISIONS = 10;

export function buildArticleRevisionSnapshot(input: {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_url: string;
  reading_time: string;
  status: string;
  category_id: number | null;
  focusKeyword: string;
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
  };
}): ArticleRevisionSnapshot {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    cover_url: input.cover_url,
    reading_time: input.reading_time,
    status: input.status,
    category_id: input.category_id,
    focus_keyword: input.focusKeyword ?? '',
    seo: {
      title: input.seo?.title ?? '',
      description: input.seo?.description ?? '',
      canonical: input.seo?.canonical ?? '',
      robots: input.seo?.robots ?? 'index,follow',
    },
  };
}

export function snapshotToDraft(snapshot: ArticleRevisionSnapshot) {
  return {
    title: snapshot.title ?? '',
    slug: snapshot.slug ?? '',
    excerpt: snapshot.excerpt ?? '',
    body: snapshot.body ?? '',
    cover_url: snapshot.cover_url ?? '',
    reading_time: snapshot.reading_time ?? '۵ دقیقه',
    status: snapshot.status ?? 'draft',
    category_id: snapshot.category_id ?? null,
    focusKeyword: snapshot.focus_keyword ?? '',
    seo: {
      title: snapshot.seo?.title ?? '',
      description: snapshot.seo?.description ?? '',
      canonical: snapshot.seo?.canonical ?? '',
      robots: snapshot.seo?.robots ?? 'index,follow',
    },
  };
}

function normalizeSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeSnapshotValue);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeSnapshotValue(record[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Stable fingerprint for detecting draft changes on the client. */
export function hashRevisionSnapshot(snapshot: ArticleRevisionSnapshot): string {
  return JSON.stringify(normalizeSnapshotValue(snapshot));
}

export function formatRevisionTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
