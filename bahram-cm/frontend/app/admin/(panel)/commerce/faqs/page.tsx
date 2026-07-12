import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminPage } from '../../ui';
import { getFaqs } from '@/lib/admin/commerceData';
import { FaqSortableList } from './FaqSortableList';

export const dynamic = 'force-dynamic';

export default async function FaqsPage() {
  const { items: faqs, error } = await getFaqs();
  const activeCount = faqs.filter((f) => f.is_active).length;

  return (
    <AdminPage
      title="سوالات متداول فروش"
      desc="مدیریت سوالات سایت، صفحه FAQ و چت‌بات"
      icon="HelpCircle"
      headerVariant="commerce"
      action={
        <Link href="/admin/commerce/faqs/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> سوال جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست سوالات"
          summary={
            <>
              {faqs.length.toLocaleString('fa-IR')} سوال · {activeCount.toLocaleString('fa-IR')} فعال
            </>
          }
        >
          {faqs.length > 0 ? (
            <FaqSortableList faqs={faqs} />
          ) : (
            <AdminListEmpty
              icon="HelpCircle"
              title="سوالی ثبت نشده"
              description="سوالات پرتکرار را اضافه کنید تا در صفحه FAQ و چت‌بات نمایش داده شوند."
              action={
                <Link href="/admin/commerce/faqs/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن سوال
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
