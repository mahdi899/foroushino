'use client';

import { useState } from 'react';
import { ChevronDown, Receipt } from 'lucide-react';
import { cn } from '@/lib/cn';
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function formatToman(amount: number) {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

function DetailRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-text-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-xs font-medium text-text', mono && 'font-mono')} dir={mono ? 'ltr' : undefined}>
        {children}
      </dd>
    </div>
  );
}

function OrderDetails({ order }: { order: StudentOrder }) {
  return (
    <div className="space-y-4 border-t border-border bg-surface-soft/40 px-4 py-4 sm:px-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailRow label="شماره سفارش" mono>
          {order.order_number}
        </DetailRow>
        <DetailRow label="تاریخ ثبت">{formatDateTime(order.created_at)}</DetailRow>
        <DetailRow label="تاریخ پرداخت">{formatDateTime(order.paid_at)}</DetailRow>
        <DetailRow label="وضعیت پرداخت">
          {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
        </DetailRow>
        <DetailRow label="مبلغ اصلی">{formatToman(order.amount)}</DetailRow>
        <DetailRow label="تخفیف">
          {order.discount_amount > 0 ? formatToman(order.discount_amount) : '—'}
        </DetailRow>
        <DetailRow label="مبلغ نهایی">{formatToman(order.final_amount)}</DetailRow>
        {order.referral_code ? (
          <DetailRow label="کد معرف" mono>
            {order.referral_code}
          </DetailRow>
        ) : null}
      </dl>

      <div>
        <h3 className="mb-2 text-xs font-bold text-text">اطلاعات خریدار</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
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
      </div>

      {order.customer_extra_data && Object.keys(order.customer_extra_data).length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-bold text-text">اطلاعات تکمیلی</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(order.customer_extra_data).map(([key, value]) => (
              <DetailRow key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
              </DetailRow>
            ))}
          </dl>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-bold text-text">پرداخت‌ها</h3>
        {order.payments?.length ? (
          <div className="space-y-2">
            {order.payments.map((payment, index) => (
              <div key={`${payment.ref_id ?? 'payment'}-${index}`} className="rounded-xl border border-border bg-surface p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {payment.gateway_label}
                  </span>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-muted">
                    {payment.mode_label}
                  </span>
                  <span className="ms-auto text-xs font-bold text-text">{formatToman(payment.amount)}</span>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
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
          <p className="text-xs text-text-muted">تراکنشی ثبت نشده است.</p>
        )}
      </div>
    </div>
  );
}

export function StudentOrdersList({ orders }: { orders: StudentOrder[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (orders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <Receipt size={32} className="text-text-muted" />
        <p className="text-sm text-text-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-border overflow-hidden">
      {orders.map((order) => {
        const open = openId === order.id;
        return (
          <div key={order.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : order.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 p-4 text-right transition hover:bg-surface-soft"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{order.product_title ?? 'محصول'}</p>
                <p className="mt-1 text-xs text-text-muted" dir="ltr">
                  {order.order_number}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-left">
                  <p className="text-sm font-bold text-text">{formatToman(order.final_amount)}</p>
                  <StatusBadge variant={order.status === 'fulfilled' || order.status === 'paid' ? 'success' : 'neutral'}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </StatusBadge>
                </div>
                <ChevronDown
                  className={cn('h-5 w-5 text-text-muted transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              </div>
            </button>
            {open ? <OrderDetails order={order} /> : null}
          </div>
        );
      })}
    </div>
  );
}
