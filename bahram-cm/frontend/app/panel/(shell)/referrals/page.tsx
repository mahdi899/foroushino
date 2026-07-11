import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock, CreditCard, Gift, LifeBuoy, Users, Wallet } from 'lucide-react';
import { WithdrawalVerificationModal } from '@/components/student-panel/referrals/WithdrawalVerificationModal';
import { ReferralCashbackProductCard } from '@/components/student-panel/referrals/ReferralCashbackProductCard';
import { ReferralHeroBanner } from '@/components/student-panel/referrals/ReferralHeroBanner';
import { PanelTomanAmount } from '@/components/student-panel/ui/PanelTomanAmount';
import { StatCard } from '@/components/student-panel/ui/StatCard';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';
import { panelStudentFetch } from '@/lib/student/panelServer';
import { getCurrentStudent } from '@/lib/student/session';

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
  const [user, { data: referral }, { data: payouts }] = await Promise.all([
    getCurrentStudent(),
    panelStudentFetch<{ data: ReferralData }>('/referrals'),
    panelStudentFetch<{ data: Payout[] }>('/cashback-payouts'),
  ]);
  const verificationLevel = user?.verification_level ?? 1;

  return (
    <div className="panel-page-inner panel-referrals-page flex flex-col gap-5">
      <ReferralHeroBanner code={referral.code} link={referral.link} />

      <div className="panel-stat-grid">
        <StatCard
          variant="gold"
          icon={Wallet}
          value={<PanelTomanAmount amount={referral.summary.payable_amount} />}
          label="موجودی قابل برداشت"
        />
        <StatCard
          variant="blue"
          icon={Clock}
          value={<PanelTomanAmount amount={referral.summary.pending_amount} />}
          label="در انتظار واریز"
        />
        <StatCard
          variant="green"
          icon={CheckCircle2}
          value={<PanelTomanAmount amount={referral.summary.paid_amount} />}
          label="پرداخت‌شده"
        />
        <StatCard
          variant="teal"
          icon={Users}
          value={
            <span className="text-xl font-bold text-text sm:text-2xl">
              {referral.summary.successful_purchases.toLocaleString('fa-IR')}
            </span>
          }
          label="دعوت موفق"
        />
      </div>

      <div className="panel-aside-layout">
        <div className="flex flex-col gap-5">
          <div className="card panel-referral-card p-6">
            <h2 className="mb-4 text-base font-bold text-text">درخواست واریز کش‌بک</h2>
            <WithdrawalVerificationModal
              verificationLevel={verificationLevel}
              payableAmount={referral.summary.payable_amount}
            />
          </div>

          {payouts.length > 0 ? (
            <div className="card panel-referral-card p-6">
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
            <div className="card panel-referral-card p-6">
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
                    <p className="panel-card-subtext mt-1">{invitee.product_title ?? 'محصول نامشخص'}</p>
                    <p className="mt-2 text-sm text-text-muted">
                      {invitee.cashback_amount.toLocaleString('fa-IR')} تومان کش‌بک
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="panel-empty-state card flex flex-col items-center gap-3 p-8 text-center">
              <Gift size={30} style={{ color: 'var(--color-gold)' }} />
              <p className="text-sm text-text-muted">هنوز دعوت‌شده‌ای ثبت نشده است.</p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card panel-referral-aside-card p-5">
            <h3 className="panel-card-title mb-4">مبالغ کش‌بک محصولات</h3>
            {referral.cashback_products?.length ? (
              <ul className="space-y-3">
                {referral.cashback_products.map((product) => (
                  <ReferralCashbackProductCard
                    key={product.slug}
                    title={product.title}
                    type={product.type}
                    value={product.value}
                  />
                ))}
              </ul>
            ) : (
              <p className="panel-card-text leading-relaxed">
                فعلاً محصولی با کش‌بک معرفی فعال نیست.
              </p>
            )}
          </div>

          <div className="card panel-referral-aside-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="panel-referral-aside-card__icon" aria-hidden>
                <CreditCard size={16} strokeWidth={2} />
              </span>
              <h3 className="panel-card-title">شماره کارت واریز</h3>
            </div>
            <p className="panel-card-text leading-relaxed">
              برای دریافت کش‌بک، شماره کارت خود را هنگام ثبت درخواست واریز وارد کنید.
            </p>
          </div>

          <div className="card panel-referral-aside-card p-5">
            <h3 className="panel-card-title mb-4">چطور کار می‌کند؟</h3>
            <ol className="space-y-4">
              {[
                'لینک یا کد اختصاصی‌ات را با دوستان به اشتراک بگذار.',
                'با خرید موفق آن‌ها، کش‌بک به حسابت اضافه می‌شود.',
                'درخواست واریز ثبت کن و پاداش را دریافت کن.',
              ].map((step, index) => (
                <li key={step} className="panel-stepper-item" data-state="done">
                  <span className="panel-stepper-item__dot">{index + 1}</span>
                  <p className="panel-card-text leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
            <Link href="/panel/support" className="panel-cta-btn mt-4">
              <LifeBuoy size={15} strokeWidth={2} />
              سوالی دارید؟
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
