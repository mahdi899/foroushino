/** Article editor payload types (kept outside "use server" modules for Next.js bundler). */

export interface ArticlePayload {
  title: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  cover_url?: string;
  cover_url_mobile?: string;
  reading_time?: string;
  status?: string;
  published_at?: string | null;
  category_id?: number | null;
  seo?: { title?: string; description?: string; canonical?: string; robots?: string };
}
