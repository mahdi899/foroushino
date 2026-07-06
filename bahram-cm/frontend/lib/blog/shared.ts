export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string | null;
  cover: string;
  readingTime: string;
  publishedAt: string | null;
  body?: string;
}

export function blogCategoryPath(slug: string): string {
  return `/blog/${slug}`;
}
