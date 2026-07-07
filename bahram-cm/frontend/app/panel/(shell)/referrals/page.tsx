import type { Metadata } from 'next';
import { Copy, Gift } from 'lucide-react';
import { CashbackPayoutForm } from '@/components/student-panel/referrals/CashbackPayoutForm';
import { studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'باشگاه مشتریان | پنل کاربری', robots: { index: false, follow: false } };

interface ReferralData {
  code: string;
  link: string;
  summary: { successful_purchases: number; payable_amount: number; paid_amount: number; pending_amount: number };
  invitees: { buyer_name: string | null; status: string; cashback_amount: number; converted_at: string | null }[];
}

interface Payout {
  id: number;
  amount: number;
  masked_card_number: string | null;
  status: string;
  created_at: string | null;
}

export default async function PanelReferralsPage() {
  const [{ data: referral }, { data: payouts }] = await Promise.all([
    studentFetch<{ data: ReferralData }>('/referrals'),
    studentFetch<{ data: Payout[] }>('/cashback-payouts'),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold text-text">باشگاه مشتریان</h1>

      <div className="card p-6">
        <div className="flex items-center gap-3">
          <Gift size={22} className="text-primary" />
          <h2 className="text-base font-bold text-text">لینک دعوت شما</h2>
        </div>
        <p className="mt-3 break-all rounded-lg bg-surface-soft p-3 text-sm text-text" dir="ltr">
          {referral.link}
        </p>
        <p className="mt-2 text-xs text-text-muted">کد اختصاصی شما: {referral.code}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-text">{referral.summary.successful_purchases}</p>
          <p className="mt-1 text-xs text-text-muted">خرید موفق</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-text">{referral.summary.payable_amount.toLocaleString('fa-IR')}</p>
          <p className="mt-1 text-xs text-text-muted">قابل دریافت (تومان)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-text">{referral.summary.paid_amount.toLocaleString('fa-IR')}</p>
          <p className="mt-1 text-xs text-text-muted">پرداخت‌شده (تومان)</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-bold text-text">درخواست واریز</h2>
        <CashbackPayoutForm payableAmount={referral.summary.payable_amount} />
      </div>

      {payouts.length > 0 ? (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold text-text">درخواست‌های واریز</h2>
          <ul className="flex flex-col divide-y divide-border">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-text-muted" dir="ltr">{p.masked_card_number}</span>
                <span className="font-semibold text-text">{p.amount.toLocaleString('fa-IR')} تومان</span>
                <span className="badge badge-neutral">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {referral.invitees.length > 0 ? (
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
            <Copy size={16} />
            دعوت‌شدگان
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {referral.invitees.map((invitee, index) => (
              <li key={index} className="flex items-center justify-between py-3 text-sm">
                <span className="text-text">{invitee.buyer_name ?? 'کاربر'}</span>
                <span className="badge badge-neutral">{invitee.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
