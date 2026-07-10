import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminPage, Badge, EditLink, Table } from '../../ui';
import { getDiscountCodes } from '@/lib/admin/commerceData';
import {
  DISCOUNT_RESTRICTION_LABELS,
  DISCOUNT_TYPE_LABELS,
  formatToman,
  type AdminDiscountCode,
} from '@/lib/admin/commerceTypes';
import { formatPanelFa } from '@/lib/persian';

export const dynamic = 'force-dynamic';

function discountLabel(code: AdminDiscountCode): string {
  if (code.discount_type === 'percent') {
    return `${formatPanelFa(code.discount_value)}٪`;
  }
  return formatToman(code.discount_value);
}

function usageLabel(code: AdminDiscountCode): string {
  if (code.max_uses == null) {
    return `${formatPanelFa(code.uses_count)} استفاده`;
  }
  return `${formatPanelFa(code.uses_count)} / ${formatPanelFa(code.max_uses)}`;
}

export default async function DiscountCodesPage() {
  const { items: codes, error } = await getDiscountCodes();
  const activeCount = codes.filter((c) => c.is_active).length;

  return (
    <AdminPage
      title="کدهای تخفیف"
      desc="تعریف و مدیریت کوپن‌های تخفیف فروش"
      icon="TicketPercent"
      headerVariant="commerce"
      action={
        <Link href="/admin/commerce/discount-codes/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> کد جدید
        </Link>
      }
    >
      <div className="admin-content-list">
        {error ? <div className="admin-content-list__error">{error}</div> : null}

        <AdminContentPanel
          title="فهرست کدهای تخفیف"
          summary={
            <>
              {codes.length.toLocaleString('fa-IR')} کد · {activeCount.toLocaleString('fa-IR')} فعال
            </>
          }
        >
          {codes.length > 0 ? (
            <Table
              head={['کد', 'عنوان', 'نوع', 'محدودیت', 'مصرف', 'وضعیت', 'عملیات']}
              mobile={codes.map((code) => (
                <AdminTableCard
                  key={code.id}
                  title={
                    <span className="font-mono text-sm" dir="ltr">
                      {code.code}
                    </span>
                  }
                  fields={[
                    { label: 'عنوان', value: code.title },
                    { label: 'نوع', value: discountLabel(code) },
                    { label: 'محدودیت', value: DISCOUNT_RESTRICTION_LABELS[code.restriction] },
                    { label: 'مصرف', value: usageLabel(code) },
                    {
                      label: 'وضعیت',
                      value: (
                        <Badge tone={code.is_active ? 'success' : 'default'}>
                          {code.is_active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      ),
                    },
                  ]}
                  footer={<EditLink href={`/admin/commerce/discount-codes/${code.id}`} />}
                />
              ))}
            >
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3 font-mono text-sm" dir="ltr">
                    {code.code}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 font-medium">{code.title}</p>
                  </td>
                  <td className="px-4 py-3 text-caption">{discountLabel(code)}</td>
                  <td className="px-4 py-3 text-caption">{DISCOUNT_RESTRICTION_LABELS[code.restriction]}</td>
                  <td className="px-4 py-3 text-caption">{usageLabel(code)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={code.is_active ? 'success' : 'default'}>
                      {code.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/commerce/discount-codes/${code.id}`} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <AdminListEmpty
              icon="TicketPercent"
              title="کد تخفیفی ثبت نشده"
              description="کد تخفیف درصدی یا مبلغ ثابت بسازید و لینک اختصاصی به خریداران بدهید."
              action={
                <Link href="/admin/commerce/discount-codes/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن کد تخفیف
                </Link>
              }
            />
          )}
        </AdminContentPanel>
      </div>
    </AdminPage>
  );
}
