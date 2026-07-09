'use client';

import { useState } from 'react';
import { ChevronDown, CreditCard, Package, Receipt, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PanelTomanAmount } from '@/components/student-panel/ui/PanelTomanAmount';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';

export interface StudentOrder {
  id: number;
  order_number: string;
  product_title: string | null;
  product_type?: string | null;
  product_slug?: string | null;
  amount: number;
  discount_amount: number;
  final_amount: number;
  status: string;
  payment_status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_national_code?: string | null;
  customer_extra_data?: Record<string, unknown> | null;
  referral_code?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  payments?: StudentOrderPayment[];
}

interface StudentOrderPayment {
  gateway_label: string;
  mode_label: string;
  ref_id?: string | null;
  amount: number;
  status: string;
  card_pan?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  fulfilled: 'تکمیل‌شده',
  failed: 'ناموفق',
  cancelled: 'لغو‌شده',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  paid: 'موفق',
  failed: 'ناموفق',
  canceled: 'لغو‌شده',
};

const PAYMENT_RECORD_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
  canceled: 'لغو‌شده',
};

function orderStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'fulfilled' || status === 'paid') return 'success';
  if (status === 'pending_payment') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'neutral';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function DetailRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="panel-order-detail">
      <dt className="panel-order-detail__label">{label}</dt>
      <dd className={cn('panel-order-detail__value', mono && 'font-mono')} dir={mono ? 'ltr' : undefined}>
        {children}
      </dd>
    </div>
  );
}

function OrderSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Package;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-order-section">
      <header className="panel-order-section__header">
        <Icon size={16} strokeWidth={2} aria-hidden />
        <h3>{title}</h3>
      </header>
      {children}
    </section>
  );
}

function OrderDetails({ order }: { order: StudentOrder }) {
  return (
    <div className="panel-order-details">
      <OrderSection icon={Package} title="جزئیات سفارش">
        <dl className="panel-order-details__grid">
          <DetailRow label="شماره سفارش" mono>
            {order.order_number}
          </DetailRow>
          <DetailRow label="تاریخ ثبت">{formatDateTime(order.created_at)}</DetailRow>
          <DetailRow label="تاریخ پرداخت">{formatDateTime(order.paid_at)}</DetailRow>
          <DetailRow label="وضعیت پرداخت">
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </DetailRow>
          <DetailRow label="مبلغ اصلی">
            <PanelTomanAmount amount={order.amount} size="sm" />
          </DetailRow>
          <DetailRow label="تخفیف">
            {order.discount_amount > 0 ? <PanelTomanAmount amount={order.discount_amount} size="sm" /> : '—'}
          </DetailRow>
          <DetailRow label="مبلغ نهایی">
            <PanelTomanAmount amount={order.final_amount} size="sm" />
          </DetailRow>
          {order.referral_code ? (
            <DetailRow label="کد معرف" mono>
              {order.referral_code}
            </DetailRow>
          ) : null}
        </dl>
      </OrderSection>

      <OrderSection icon={UserRound} title="اطلاعات خریدار">
        <dl className="panel-order-details__grid">
          <DetailRow label="نام">{order.customer_name ?? '—'}</DetailRow>
          <DetailRow label="موبایل" mono>
            {order.customer_phone ?? '—'}
          </DetailRow>
          {order.customer_email ? (
            <DetailRow label="ایمیل" mono>
              {order.customer_email}
            </DetailRow>
          ) : null}
          {order.customer_national_code ? (
            <DetailRow label="کد ملی" mono>
              {order.customer_national_code}
            </DetailRow>
          ) : null}
        </dl>
      </OrderSection>

      {order.customer_extra_data && Object.keys(order.customer_extra_data).length > 0 ? (
        <OrderSection icon={Receipt} title="اطلاعات تکمیلی">
          <dl className="panel-order-details__grid">
            {Object.entries(order.customer_extra_data).map(([key, value]) => (
              <DetailRow key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
              </DetailRow>
            ))}
          </dl>
        </OrderSection>
      ) : null}

      <OrderSection icon={CreditCard} title="پرداخت‌ها">
        {order.payments?.length ? (
          <div className="panel-order-payments">
            {order.payments.map((payment, index) => (
              <div key={`${payment.ref_id ?? 'payment'}-${index}`} className="panel-order-payment">
                <div className="panel-order-payment__head">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="panel-order-payment__chip panel-order-payment__chip--primary">
                      {payment.gateway_label}
                    </span>
                    <span className="panel-order-payment__chip">{payment.mode_label}</span>
                  </div>
                  <PanelTomanAmount amount={payment.amount} size="sm" />
                </div>
                <dl className="panel-order-details__grid panel-order-details__grid--compact">
                  <DetailRow label="وضعیت تراکنش">
                    {PAYMENT_RECORD_LABELS[payment.status] ?? payment.status}
                  </DetailRow>
                  {payment.ref_id ? (
                    <DetailRow label="شناسه پیگیری" mono>
                      {payment.ref_id}
                    </DetailRow>
                  ) : null}
                  {payment.card_pan ? (
                    <DetailRow label="کارت" mono>
                      {payment.card_pan}
                    </DetailRow>
                  ) : null}
                  <DetailRow label="زمان پرداخت">{formatDateTime(payment.paid_at ?? payment.created_at)}</DetailRow>
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">تراکنشی ثبت نشده است.</p>
        )}
      </OrderSection>
    </div>
  );
}

export function StudentOrdersList({ orders }: { orders: StudentOrder[] }) {
  const [openId, setOpenId] = useState<number | null>(orders[0]?.id ?? null);

  if (orders.length === 0) {
    return (
      <div className="panel-empty-state card flex flex-col items-center gap-3 p-10 text-center">
        <span className="panel-support-empty__icon">
          <Receipt size={22} aria-hidden />
        </span>
        <p className="text-sm font-medium text-text">هنوز سفارشی ثبت نکرده‌اید</p>
        <p className="max-w-xs text-sm leading-relaxed text-text-muted">پس از خرید دوره، جزئیات سفارش اینجا نمایش داده می‌شود.</p>
      </div>
    );
  }

  return (
    <ul className="panel-order-list">
      {orders.map((order) => {
        const open = openId === order.id;
        return (
          <li key={order.id} className={cn('panel-order-card card overflow-hidden', open && 'panel-order-card--open')}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : order.id)}
              aria-expanded={open}
              className="panel-order-card__trigger"
            >
              <span className="panel-order-card__icon" aria-hidden>
                <Package size={18} strokeWidth={2} />
              </span>
              <span className="panel-order-card__main">
                <span className="panel-order-card__title">{order.product_title ?? 'محصول'}</span>
                <span className="panel-order-card__meta" dir="ltr">
                  {order.order_number}
                </span>
              </span>
              <span className="panel-order-card__trail">
                <span className="panel-order-card__amount">
                  <PanelTomanAmount amount={order.final_amount} size="sm" />
                </span>
                <StatusBadge variant={orderStatusVariant(order.status)}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </StatusBadge>
                <ChevronDown
                  className={cn('panel-order-card__chevron', open && 'panel-order-card__chevron--open')}
                  aria-hidden
                />
              </span>
            </button>
            {open ? <OrderDetails order={order} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
