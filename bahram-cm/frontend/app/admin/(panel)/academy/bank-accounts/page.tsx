import { AdminPage, Table } from '../../ui';
import { getVerifiedBankAccounts } from '@/lib/admin/academyData';
import { BankAccountRow } from './BankAccountRow';

export const dynamic = 'force-dynamic';

export default async function BankAccountsPage() {
  const { items, error } = await getVerifiedBankAccounts({ status: 'pending' });

  return (
    <AdminPage
      title="تأیید کارت بانکی"
      desc="زمانی که سرویس تطبیق خودکار (شاهکار/CardMatch) خاموش یا در دسترس نباشد، ثبت کارت‌های همکاری در فروش باید دستی تأیید شود."
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      ) : null}
      {items.length > 0 ? (
        <Table head={['دانشجو', 'کارت / شبا', 'نام صاحب حساب', 'تاریخ ثبت', 'اقدام']}>
          {items.map((a) => (
            <BankAccountRow key={a.id} account={a} />
          ))}
        </Table>
      ) : (
        <div className="card p-8 text-center text-small text-text-muted">کارتی در انتظار تأیید وجود ندارد.</div>
      )}
    </AdminPage>
  );
}
