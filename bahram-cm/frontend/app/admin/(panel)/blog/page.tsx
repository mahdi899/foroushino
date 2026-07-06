import Link from 'next/link';
import { ExternalLink, PenLine, Plus } from 'lucide-react';
import { AdminPage } from '../ui';
import { getAdminArticles, getTrashedArticles } from '@/lib/admin/articleActions';
import { ArticleTrashPanel } from './ArticleTrashPanel';
import type { ApiArticle } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  active: 'منتشر شده',
  draft: 'پیش‌نویس',
};

function ArticleList({ articles }: { articles: ApiArticle[] }) {
  if (!articles.length) {
    return (
      <div className="card p-10 text-center">
        <p className="text-small text-text-muted">هنوز مقاله‌ای ثبت نشده.</p>
        <Link href="/admin/blog/new" className="btn btn-primary mt-4 px-4 py-2 text-small">
          <Plus className="h-4 w-4" />
          اولین مقاله
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-border">
        {articles.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-primary-dark">{a.title}</p>
              <p className="mt-1 line-clamp-1 text-caption text-text-muted">{a.excerpt || '—'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-caption">
                <span
                  className={`rounded-pill px-2 py-0.5 font-medium ${
                    a.status === 'active' ? 'bg-success/10 text-success' : 'bg-surface-soft text-text-muted'
                  }`}
                >
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
                {a.category?.name && (
                  <span className="rounded-pill bg-accent/10 px-2 py-0.5 text-accent">{a.category.name}</span>
                )}
                {a.reading_time && <span className="text-text-muted">{a.reading_time}</span>}
                {a.slug && (
                  <span className="font-mono text-text-muted" dir="ltr">
                    /insights/{a.slug}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={`/admin/blog/${a.id}`} className="btn btn-secondary px-3 py-2 text-small">
                <PenLine className="h-4 w-4" />
                ویرایش
              </Link>
              {a.slug && (
                <Link href={`/insights/${a.slug}`} target="_blank" className="btn btn-secondary px-3 py-2 text-small">
                  <ExternalLink className="h-4 w-4" />
                  نمایش
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminBlogListPage() {
  const [articles, trashed] = await Promise.all([getAdminArticles(), getTrashedArticles()]);

  return (
    <AdminPage
      title="مقالات"
      desc="لیست مقالات مجله — ویرایش، پیش‌نمایش و مدیریت سئو"
      action={
        <Link href="/admin/blog/new" className="btn btn-primary px-4 py-2 text-small">
          <Plus className="h-4 w-4" />
          افزودن مقاله
        </Link>
      }
    >
      <ArticleList articles={articles} />
      <div className="mt-6">
        <ArticleTrashPanel initialItems={trashed} />
      </div>
    </AdminPage>
  );
}
