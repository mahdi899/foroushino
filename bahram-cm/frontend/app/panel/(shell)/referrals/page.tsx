import type { Metadata } from 'next';
import { CheckCircle2, Clock, Gift, Users, Wallet } from 'lucide-react';
import { CashbackPayoutForm } from '@/components/student-panel/referrals/CashbackPayoutForm';
import { ReferralHeroBanner } from '@/components/student-panel/referrals/ReferralHeroBanner';
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

  const stats = [
    { label: 'قابل برداشت', value: `${referral.summary.payable_amount.toLocaleString('fa-IR')} ت`, icon: Wallet, gold: true },
    { label: 'در انتظار', value: `${referral.summary.pending_amount.toLocaleString('fa-IR')} ت`, icon: Clock },
    { label: 'پرداخت‌شده', value: `${referral.summary.paid_amount.toLocaleString('fa-IR')} ت`, icon: CheckCircle2 },
    { label: 'خرید موفق', value: referral.summary.successful_purchases.toLocaleString('fa-IR'), icon: Users },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <ReferralHeroBanner code={referral.code} link={referral.link} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, gold }) => (
          <div key={label} className="card p-4">
            <Icon size={18} style={{ color: gold ? 'var(--color-gold)' : 'var(--color-primary)' }} />
            <p className="mt-3 text-lg font-bold text-text">{value}</p>
            <p className="mt-1 text-xs text-text-muted">{label}</p>
          </div>
        ))}
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
            <Users size={16} className="text-primary" />
            دعوت‌شدگان
          </h2>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="text-text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 text-right">نام</th>
                  <th className="py-2 text-right">وضعیت</th>
                  <th className="py-2 text-right">کش‌بک</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referral.invitees.map((invitee, index) => (
                  <tr key={index}>
                    <td className="py-3">{invitee.buyer_name ?? 'کاربر'}</td>
                    <td className="py-3"><span className="badge badge-neutral">{invitee.status}</span></td>
                    <td className="py-3">{invitee.cashback_amount.toLocaleString('fa-IR')} تومان</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 sm:hidden">
            {referral.invitees.map((invitee, index) => (
              <li key={index} className="rounded-xl bg-surface-soft p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-text">{invitee.buyer_name ?? 'کاربر'}</span>
                  <span className="badge badge-neutral">{invitee.status}</span>
                </div>
                <p className="mt-2 text-sm text-text-muted">{invitee.cashback_amount.toLocaleString('fa-IR')} تومان کش‌بک</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <Gift size={30} style={{ color: 'var(--color-gold)' }} />
          <p className="text-sm text-text-muted">هنوز دعوت‌شده‌ای ثبت نشده است.</p>
        </div>
      )}
    </div>
  );
}
