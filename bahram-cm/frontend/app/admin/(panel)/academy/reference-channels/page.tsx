import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, StatCard, Table } from '../../ui';
import { getReferenceChannels, getReferenceDestinationOptions } from '@/lib/admin/academyData';
import { formatToman } from '@/lib/admin/academyTypes';
import { CreateReferenceChannelForm } from './CreateReferenceChannelForm';

export const dynamic = 'force-dynamic';

export default async function ReferenceChannelsPage() {
  const [{ items: channels, error }, { items: destinations }] = await Promise.all([
    getReferenceChannels(),
    getReferenceDestinationOptions(),
  ]);

  const publishedCount = channels.filter((c) => c.status === 'published').length;
  const totalEntitlements = channels.reduce((sum, c) => sum + c.entitlements_count, 0);

  return (
    <AdminPage
      title="کانال مرجع"
      desc="فروش کانال مرجع، اتصال به مقصد تلگرام و دسترسی‌ها"
      icon="Radio"
      headerVariant="academy"
    >
      <div className="admin-content-list">
        {channels.length > 0 ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="کانال‌ها" value={channels.length.toLocaleString('fa-IR')} icon="Radio" tone="teal" />
            <StatCard label="منتشر شده" value={publishedCount.toLocaleString('fa-IR')} icon="Eye" tone="blue" />
            <StatCard
              label="دسترسی‌ها"
              value={totalEntitlements.toLocaleString('fa-IR')}
              icon="Users"
              tone="gold"
            />
          </div>
        ) : null}

        <AdminContentPanel title="ایجاد کانال مرجع" className="mb-5">
          <CreateReferenceChannelForm destinations={destinations} />
        </AdminContentPanel>

        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel title="فهرست کانال‌های مرجع">
          {channels.length > 0 ? (
            <Table
              head={['عنوان', 'قیمت', 'مقصد', 'دسترسی‌ها', 'وضعیت', 'عملیات']}
              mobile={channels.map((c) => (
                <AdminTableCard
                  key={c.id}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {c.title}
                      {c.status === 'published' ? <Badge tone="success">منتشر</Badge> : <Badge>پیش‌نویس</Badge>}
                    </span>
                  }
                  meta={`${formatToman(c.price)} · ${c.telegram_destination_title ?? 'بدون مقصد'}`}
                  actions={<EditLink href={`/admin/academy/reference-channels/${c.id}`} />}
                />
              ))}
            >
              {channels.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>{formatToman(c.price)}</td>
                  <td>{c.telegram_destination_title ?? '—'}</td>
                  <td>{c.entitlements_count.toLocaleString('fa-IR')}</td>
                  <td>{c.status === 'published' ? <Badge tone="success">منتشر</Badge> : <Badge>پیش‌نویس</Badge>}</td>
                  <td>
                    <EditLink href={`/admin/academy/reference-channels/${c.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="Radio"
              title="کانال مرجعی ثبت نشده"
              description="اولین کانال مرجع را بسازید و به مقصد تلگرام وصل کنید."
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
