import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, Clock, CreditCard, Gift, Users, Wallet } from 'lucide-react';
import { CashbackPayoutForm } from '@/components/student-panel/referrals/CashbackPayoutForm';
import { ReferralHeroBanner } from '@/components/student-panel/referrals/ReferralHeroBanner';
import { StatCard } from '@/components/student-panel/ui/StatCard';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'باشگاه مشتریان | پنل کاربری', robots: { index: false, follow: false } };

interface ReferralData {
  code: string;
  link: string;
  summary: { successful_purchases: number; payable_amount: number; paid_amount: number; pending_amount: number };
  invitees: {
    buyer_name: string | null;
    product_title: string | null;
    status: string;
    cashback_amount: number;
    converted_at: string | null;
  }[];
  cashback_products: { title: string; slug: string; type: string; value: number; label: string }[];
}

interface Payout {
  id: number;
  amount: number;
  masked_card_number: string | null;
  status: string;
  created_at: string | null;
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'neutral'> = {
  paid: 'success',
  payable: 'warning',
  pending: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  paid: 'پرداخت‌شده',
  payable: 'قابل برداشت',
  pending: 'در انتظار',
};

export default async function PanelReferralsPage() {
  const [{ data: referral }, { data: payouts }] = await Promise.all([
    panelStudentFetch<{ data: ReferralData }>('/referrals'),
    panelStudentFetch<{ data: Payout[] }>('/cashback-payouts'),
  ]);

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <ReferralHeroBanner code={referral.code} link={referral.link} />

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard
          variant="gold"
          icon={Wallet}
          value={`${referral.summary.payable_amount.toLocaleString('fa-IR')} ت`}
          label="موجودی قابل برداشت"
        />
        <StatCard
          variant="blue"
          icon={Clock}
          value={`${referral.summary.pending_amount.toLocaleString('fa-IR')} ت`}
          label="در انتظار واریز"
        />
        <StatCard
          variant="green"
          icon={CheckCircle2}
          value={`${referral.summary.paid_amount.toLocaleString('fa-IR')} ت`}
          label="پرداخت‌شده"
        />
        <StatCard
          variant="teal"
          icon={Users}
          value={referral.summary.successful_purchases.toLocaleString('fa-IR')}
          label="دعوت موفق"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <div className="card p-6">
            <h2 className="mb-4 text-base font-bold text-text">درخواست واریز کش‌بک</h2>
            <CashbackPayoutForm payableAmount={referral.summary.payable_amount} />
          </div>

          {payouts.length > 0 ? (
            <div className="card p-6">
              <h2 className="mb-4 text-base font-bold text-text">درخواست‌های واریز</h2>
              <ul className="flex flex-col divide-y divide-border">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="text-text-muted" dir="ltr">
                      {p.masked_card_number}
                    </span>
                    <span className="font-semibold text-text">{p.amount.toLocaleString('fa-IR')} تومان</span>
                    <StatusBadge variant="neutral">{p.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {referral.invitees.length > 0 ? (
            <div className="card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-text">
                <Users size={16} className="text-primary" />
                وضعیت دعوت‌ها
              </h2>

              <div className="hidden overflow-x-auto sm:block">
                <table className="panel-table">
                  <thead>
                    <tr>
                      <th>نام</th>
                      <th>محصول</th>
                      <th>تاریخ</th>
                      <th>وضعیت</th>
                      <th>کش‌بک</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referral.invitees.map((invitee, index) => (
                      <tr key={index}>
                        <td>{invitee.buyer_name ?? 'کاربر'}</td>
                        <td className="text-text-muted">{invitee.product_title ?? '—'}</td>
                        <td className="text-text-muted">
                          {invitee.converted_at ? new Date(invitee.converted_at).toLocaleDateString('fa-IR') : '—'}
                        </td>
                        <td>
                          <StatusBadge variant={STATUS_BADGE[invitee.status] ?? 'neutral'}>
                            {STATUS_LABEL[invitee.status] ?? invitee.status}
                          </StatusBadge>
                        </td>
                        <td>{invitee.cashback_amount.toLocaleString('fa-IR')} تومان</td>
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
                      <StatusBadge variant={STATUS_BADGE[invitee.status] ?? 'neutral'}>
                        {STATUS_LABEL[invitee.status] ?? invitee.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{invitee.product_title ?? 'محصول نامشخص'}</p>
                    <p className="mt-2 text-sm text-text-muted">
                      {invitee.cashback_amount.toLocaleString('fa-IR')} تومان کش‌بک
                    </p>
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

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-bold text-text">مبالغ کش‌بک محصولات</h3>
            {referral.cashback_products?.length ? (
              <ul className="space-y-3">
                {referral.cashback_products.map((product) => (
                  <li key={product.slug} className="rounded-xl bg-surface-soft px-3 py-2.5">
                    <p className="text-xs font-semibold text-text">{product.title}</p>
                    <p className="mt-1 text-[11px] text-text-muted">{product.label}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-relaxed text-text-muted">
                فعلاً محصولی با کش‌بک معرفی فعال نیست.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-text">شماره کارت واریز</h3>
            </div>
            <p className="text-xs leading-relaxed text-text-muted">
              برای دریافت کش‌بک، شماره کارت خود را هنگام ثبت درخواست واریز وارد کنید.
            </p>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-sm font-bold text-text">چطور کار می‌کند؟</h3>
            <ol className="space-y-4">
              {[
                'لینک یا کد اختصاصی‌ات را با دوستان به اشتراک بگذار.',
                'با خرید موفق آن‌ها، کش‌بک به حسابت اضافه می‌شود.',
                'درخواست واریز ثبت کن و پاداش را دریافت کن.',
              ].map((step, index) => (
                <li key={step} className="panel-stepper-item" data-state="done">
                  <span className="panel-stepper-item__dot">{index + 1}</span>
                  <p className="text-xs leading-relaxed text-text-muted">{step}</p>
                </li>
              ))}
            </ol>
            <Link href="/panel/support" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              سوالی دارید؟
              <ChevronLeft size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
