'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, FileText, Settings } from 'lucide-react';
import { AdminPage } from '../ui';
import { cn } from '@/lib/utils';
import { SeoMetaEditor } from './SeoMetaEditor';

type SeoTab = 'analytics' | 'meta';

const TABS: { id: SeoTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'analytics', label: 'تحلیل و گوگل', icon: BarChart3 },
  { id: 'meta', label: 'ویرایش متا', icon: FileText },
];

export function SeoHub({
  analytics,
  initialTab = 'analytics',
}: {
  analytics: React.ReactNode;
  initialTab?: SeoTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SeoTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const selectTab = useCallback(
    (next: SeoTab) => {
      setTab(next);
      const url = next === 'meta' ? '/admin/seo?tab=meta' : '/admin/seo';
      router.replace(url, { scroll: false });
    },
    [router],
  );

  return (
    <AdminPage
      icon="Search"
      headerVariant="seo"
      title="سئو و تحلیل"
      desc="Google Analytics، Search Console، sitemap و ویرایش متا صفحات"
      action={
        tab === 'analytics' ? (
          <Link href="/admin/settings#google-tracking" className="btn btn-secondary px-4 py-2 text-small">
            <Settings className="h-4 w-4" />
            تنظیمات GA4
          </Link>
        ) : undefined
      }
    >
      <div className="admin-tab-bar -mx-1 mb-6">
        <div className="admin-tab-bar__scroll flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface-soft p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={cn(
                'admin-tab-bar__btn inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-small font-medium transition',
                tab === id ? 'bg-surface text-text shadow-soft' : 'text-text-muted hover:bg-surface/60 hover:text-text',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'analytics' ? analytics : <SeoMetaEditor />}
    </AdminPage>
  );
}
