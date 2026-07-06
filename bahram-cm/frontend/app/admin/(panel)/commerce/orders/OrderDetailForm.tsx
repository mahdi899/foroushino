'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Save, Send } from 'lucide-react';
import { resendOrderSms, updateOrder } from '../actions';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatToman,
  type AdminOrder,
} from '@/lib/admin/commerceTypes';
import { Badge } from '../../ui';

export function OrderDetailForm({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [pending, setPending] = useState(false);
  const [smsPending, setSmsPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await updateOrder(order.id, { status, payment_status: paymentStatus });
    setPending(false);
    if (res.ok) {
      setMessage('ذخیره شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  async function onResendSms() {
    setSmsPending(true);
    setError('');
    const res = await resendOrderSms(order.id);
    setSmsPending(false);
    if (res.ok) setMessage(res.message ?? 'درخواست ارسال ثبت شد.');
    else setError(res.error ?? 'خطا');
  }

  const paid = status === 'paid' || status === 'fulfilled';

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">اطلاعات مشتری</h2>
        <dl className="grid gap-3 text-small md:grid-cols-2">
          <div><dt className="text-text-muted">شماره سفارش</dt><dd className="font-medium">{order.order_number}</dd></div>
          <div><dt className="text-text-muted">محصول</dt><dd className="font-medium">{order.product_title ?? '—'}</dd></div>
          <div><dt className="text-text-muted">نام</dt><dd>{order.customer_name}</dd></div>
          <div><dt className="text-text-muted">تلفن</dt><dd dir="ltr">{order.customer_phone}</dd></div>
          <div><dt className="text-text-muted">ایمیل</dt><dd>{order.customer_email ?? '—'}</dd></div>
          <div><dt className="text-text-muted">کد ملی</dt><dd>{order.customer_national_code ?? '—'}</dd></div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">مبلغ</h2>
        <dl className="grid gap-3 text-small md:grid-cols-3">
          <div><dt className="text-text-muted">مبلغ</dt><dd>{formatToman(order.amount)}</dd></div>
          <div><dt className="text-text-muted">تخفیف</dt><dd>{formatToman(order.discount_amount)}</dd></div>
          <div><dt className="text-text-muted">نهایی</dt><dd className="font-bold text-primary">{formatToman(order.final_amount)}</dd></div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">وضعیت</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">وضعیت سفارش</span>
            <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">وضعیت پرداخت</span>
            <select className="field-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-h3 font-bold text-primary-dark">تحویل</h2>
        <dl className="grid gap-3 text-small md:grid-cols-2">
          <div><dt className="text-text-muted">کد پیگیری پرداخت</dt><dd dir="ltr">{order.payment_ref_id ?? '—'}</dd></div>
          <div><dt className="text-text-muted">کد لایسنس SpotPlayer</dt><dd dir="ltr">{order.spotplayer_license_code ?? '—'}</dd></div>
          <div><dt className="text-text-muted">زمان ارسال پیامک</dt><dd>{order.sms_sent_at ? new Date(order.sms_sent_at).toLocaleString('fa-IR') : 'ارسال نشده'}</dd></div>
          <div><dt className="text-text-muted">تاریخ ثبت</dt><dd>{order.created_at ? new Date(order.created_at).toLocaleString('fa-IR') : '—'}</dd></div>
        </dl>
      </div>

      {error && <p className="text-small text-error">{error}</p>}
      {message && <p className="text-small text-success">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </button>
        {paid && (
          <button type="button" disabled={smsPending} onClick={() => void onResendSms()} className="btn btn-secondary">
            {smsPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ارسال مجدد پیامک
          </button>
        )}
        <Link href="/admin/commerce/orders" className="btn btn-secondary">بازگشت</Link>
      </div>
    </form>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const tone = status === 'paid' || status === 'fulfilled' ? 'success' : status === 'failed' || status === 'cancelled' ? 'warning' : 'accent';
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
