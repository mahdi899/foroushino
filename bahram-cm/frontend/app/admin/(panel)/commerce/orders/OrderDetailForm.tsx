'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Copy, ExternalLink, KeyRound, Loader2, Save, Send } from 'lucide-react';
import { fulfillOrder, resendOrderSms, updateOrder } from '../actions';
import { AdminTomanAmount } from '@/components/admin/layout/AdminTomanAmount';
import {
  COURSE_ACCESS_SOURCE_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type AdminOrderDetail,
  type AdminOrderPayment,
} from '@/lib/admin/commerceTypes';
import { Badge } from '../../ui';
import { cn } from '@/lib/utils';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
}

function CopyableValue({
  value,
  label,
  full = false,
}: {
  value: string | null | undefined;
  label?: string;
  /** Show the full value (no truncate) — for long license keys. */
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-text-muted">—</span>;

  async function copy() {
    await navigator.clipboard.writeText(value!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn('flex min-w-0 gap-1.5', full ? 'items-start' : 'items-center')}>
      <code
        className={cn(
          'min-w-0 flex-1 rounded bg-surface-soft px-2 py-1 text-caption text-text',
          full ? 'break-all whitespace-pre-wrap admin-text-meta leading-relaxed' : 'truncate',
        )}
        dir="ltr"
        title={value}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn(
          'shrink-0 rounded-md p-1.5 text-text-muted transition hover:bg-surface-soft hover:text-primary',
          full && 'mt-0.5',
        )}
        aria-label={label ? `کپی ${label}` : 'کپی'}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function DetailItem({
  label,
  children,
  mono,
  className,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="admin-text-meta font-medium text-text-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-caption text-text', mono && 'font-mono')} dir={mono ? 'ltr' : undefined}>
        {children}
      </dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-surface p-3.5 sm:p-4', className)}>
      <h2 className="mb-3 text-small font-bold text-primary-dark">{title}</h2>
      {children}
    </section>
  );
}

function PaymentRow({ payment }: { payment: AdminOrderPayment }) {
  const tone =
    payment.status === 'paid' ? 'success' : payment.status === 'failed' ? 'danger' : payment.status === 'canceled' ? 'warning' : 'default';

  return (
    <div className="rounded-lg border border-border bg-surface-soft/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{payment.gateway_label}</Badge>
        <Badge tone={payment.mode === 'sandbox' ? 'warning' : 'success'}>{payment.mode_label}</Badge>
        <Badge tone={tone}>{PAYMENT_RECORD_STATUS_LABELS[payment.status] ?? payment.status}</Badge>
        <AdminTomanAmount amount={payment.amount} size="sm" amountClassName="text-primary" />
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <DetailItem label="Authority (کد تراکنش درگاه)">
          <CopyableValue value={payment.authority} label="Authority" />
        </DetailItem>
        <DetailItem label="Ref ID (کد پیگیری زرین‌پال)">
          <CopyableValue value={payment.ref_id} label="Ref ID" />
        </DetailItem>
        {payment.card_pan && (
          <DetailItem label="شماره کارت (ماسک‌شده)">
            <CopyableValue value={payment.card_pan} label="کارت" />
          </DetailItem>
        )}
        {payment.verify_code != null && (
          <DetailItem label="کد تایید درگاه" mono>
            {String(payment.verify_code)}
          </DetailItem>
        )}
        <DetailItem label="زمان پرداخت">{formatDateTime(payment.paid_at)}</DetailItem>
        <DetailItem label="زمان ایجاد درخواست">{formatDateTime(payment.created_at)}</DetailItem>
      </dl>
    </div>
  );
}

export function OrderDetailForm({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [pending, setPending] = useState(false);
  const [smsPending, setSmsPending] = useState(false);
  const [fulfillPending, setFulfillPending] = useState(false);
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

  async function onFulfill() {
    setFulfillPending(true);
    setError('');
    setMessage('');
    const res = await fulfillOrder(order.id);
    setFulfillPending(false);
    if (res.ok) {
      setMessage(res.message ?? 'تحویل انجام شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  const paid = status === 'paid' || status === 'fulfilled';
  const licenseKey = order.spotplayer_license?.license_key ?? order.spotplayer_license_code;
  const licenseUrl = order.spotplayer_license?.license_url ?? null;
  const hasSpotPlayerProduct = Boolean(order.product?.spotplayer_course_id);
  const needsFulfillment = paid && hasSpotPlayerProduct && (!licenseKey || !order.course_access);

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <OrderStatusBadge status={order.status} />
        <Badge tone={order.payment_status === 'paid' ? 'success' : order.payment_status === 'failed' ? 'danger' : 'warning'}>
          پرداخت: {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
        </Badge>
        <span className="text-caption text-text-muted" dir="ltr">
          {order.order_number}
        </span>
        <AdminTomanAmount amount={order.final_amount} size="sm" amountClassName="text-primary" className="ms-auto" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4">
          <SectionCard title="مشتری و محصول">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="نام">{order.customer_name}</DetailItem>
              <DetailItem label="موبایل" mono>
                {order.customer_phone}
              </DetailItem>
              <DetailItem label="ایمیل" mono>
                {order.customer_email ?? '—'}
              </DetailItem>
              <DetailItem label="کد ملی" mono>
                {order.customer_national_code ?? '—'}
              </DetailItem>
              <DetailItem label="محصول" className="sm:col-span-2">
                {order.product?.title ?? order.product_title ?? '—'}
              </DetailItem>
              {order.user_id && (
                <DetailItem label="حساب دانشجو">
                  <Link href={`/admin/academy/students/${order.user_id}`} className="text-accent hover:underline">
                    {order.user_name ?? 'مشاهده پروفایل'}
                  </Link>
                  {order.user_mobile && (
                    <span className="mr-2 text-text-muted" dir="ltr">
                      ({order.user_mobile})
                    </span>
                  )}
                </DetailItem>
              )}
              {order.referral_code && <DetailItem label="کد معرف" mono>{order.referral_code}</DetailItem>}
            </dl>
            {order.customer_extra_data && Object.keys(order.customer_extra_data).length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 admin-text-meta font-medium text-text-muted">اطلاعات تکمیلی فرم</p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(order.customer_extra_data).map(([key, val]) => (
                    <DetailItem key={key} label={key}>
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                    </DetailItem>
                  ))}
                </dl>
              </div>
            )}
          </SectionCard>

          <SectionCard title="پرداخت و درگاه">
            {order.payments.length > 0 ? (
              <div className="space-y-3">
                {order.payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </div>
            ) : (
              <p className="text-caption text-text-muted">هنوز تلاشی برای پرداخت از درگاه ثبت نشده است.</p>
            )}
          </SectionCard>

          <SectionCard title="تحویل دیجیتال (SpotPlayer)">
            {needsFulfillment ? (
              <div className="mb-4 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2.5 text-caption text-text">
                لایسنس یا دسترسی دوره هنوز کامل نشده است. با دکمهٔ «تولید لایسنس» می‌توانید برای این کاربر صادر کنید.
              </div>
            ) : null}

            <dl className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="کد لایسنس SpotPlayer" className="sm:col-span-2">
                <CopyableValue value={licenseKey} label="لایسنس" full />
              </DetailItem>
              <DetailItem label="لینک لایسنس" className="sm:col-span-2">
                {licenseUrl ? (
                  <div className="space-y-2">
                    <CopyableValue value={licenseUrl} label="لینک لایسنس" full />
                    <a
                      href={licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                      dir="ltr"
                    >
                      باز کردن در SpotPlayer <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </DetailItem>
              {order.spotplayer_license?.spotplayer_license_id ? (
                <DetailItem label="شناسه لایسنس در SpotPlayer" mono className="sm:col-span-2">
                  <CopyableValue value={order.spotplayer_license.spotplayer_license_id} label="شناسه SpotPlayer" />
                </DetailItem>
              ) : null}
              {order.product?.spotplayer_course_id ? (
                <DetailItem label="شناسه دوره محصول" mono className="sm:col-span-2">
                  <CopyableValue value={order.product.spotplayer_course_id} label="شناسه دوره" />
                </DetailItem>
              ) : null}
              {order.spotplayer_license?.spotplayer_course_id &&
                order.spotplayer_license.spotplayer_course_id !== order.product?.spotplayer_course_id ? (
                <DetailItem label="شناسه دوره روی لایسنس" mono className="sm:col-span-2">
                  {order.spotplayer_license.spotplayer_course_id}
                </DetailItem>
              ) : null}
              {order.spotplayer_license ? (
                <>
                  <DetailItem label="وضعیت لایسنس">
                    <Badge tone={order.spotplayer_license.status === 'active' ? 'success' : 'warning'}>
                      {order.spotplayer_license.status}
                    </Badge>
                  </DetailItem>
                  <DetailItem label="محدودیت دستگاه">
                    {order.spotplayer_license.device_limit ?? '—'}
                  </DetailItem>
                  <DetailItem label="زمان صدور لایسنس">
                    {formatDateTime(order.spotplayer_license.created_at)}
                  </DetailItem>
                  <DetailItem label="آخرین به‌روزرسانی لایسنس">
                    {formatDateTime(order.spotplayer_license.updated_at)}
                  </DetailItem>
                </>
              ) : null}
              {order.course_access ? (
                <>
                  <DetailItem label="دسترسی دوره">
                    <Badge tone={order.course_access.status === 'active' ? 'success' : 'default'}>
                      {order.course_access.status}
                    </Badge>
                  </DetailItem>
                  <DetailItem label="منبع دسترسی">
                    {COURSE_ACCESS_SOURCE_LABELS[order.course_access.source] ?? order.course_access.source}
                  </DetailItem>
                  <DetailItem label="نوع دسترسی">{order.course_access.access_type}</DetailItem>
                  <DetailItem label="فعال‌سازی">{formatDateTime(order.course_access.activated_at)}</DetailItem>
                </>
              ) : (
                <DetailItem label="دسترسی دوره">
                  <span className="text-text-muted">صدور نشده</span>
                </DetailItem>
              )}
              <DetailItem label="وضعیت تحویل سفارش">
                <Badge tone={order.status === 'fulfilled' ? 'success' : paid ? 'warning' : 'default'}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </DetailItem>
              <DetailItem label="ارسال پیامک">{formatDateTime(order.sms_sent_at)}</DetailItem>
              <DetailItem label="تاریخ پرداخت">{formatDateTime(order.paid_at)}</DetailItem>
              <DetailItem label="تاریخ ثبت">{formatDateTime(order.created_at)}</DetailItem>
            </dl>

            {paid && hasSpotPlayerProduct ? (
              <div className="mt-4 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={fulfillPending}
                  onClick={() => void onFulfill()}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  {fulfillPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {licenseKey ? 'اجرای مجدد تحویل / تکمیل دسترسی' : 'تولید لایسنس و فعال‌سازی دسترسی'}
                </button>
              </div>
            ) : null}
          </SectionCard>

          {order.referral_conversion && (
            <SectionCard title="کش‌بک معرف">
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="معرف">
                  {order.referral_conversion.referrer_name ?? '—'}
                  {order.referral_conversion.referrer_mobile && (
                    <span className="mr-1 text-text-muted" dir="ltr">
                      ({order.referral_conversion.referrer_mobile})
                    </span>
                  )}
                </DetailItem>
                <DetailItem label="مبلغ کش‌بک">
                  <AdminTomanAmount amount={order.referral_conversion.cashback_amount} size="sm" />
                </DetailItem>
                <DetailItem label="وضعیت">
                  <Badge>{order.referral_conversion.status}</Badge>
                </DetailItem>
              </dl>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4">
          <SectionCard title="مبلغ">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-soft p-2.5">
                <dt className="admin-text-meta text-text-muted">مبلغ</dt>
                <dd className="mt-1 flex justify-center">
                  <AdminTomanAmount amount={order.amount} size="sm" />
                </dd>
              </div>
              <div className="rounded-lg bg-surface-soft p-2.5">
                <dt className="admin-text-meta text-text-muted">تخفیف</dt>
                <dd className="mt-1 flex justify-center">
                  <AdminTomanAmount amount={order.discount_amount} size="sm" />
                </dd>
              </div>
              <div className="rounded-lg bg-primary-soft p-2.5">
                <dt className="admin-text-meta text-text-muted">نهایی</dt>
                <dd className="mt-1 flex justify-center">
                  <AdminTomanAmount amount={order.final_amount} size="sm" amountClassName="font-bold text-primary" />
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="مدیریت وضعیت">
            <div className="space-y-3">
              <label className="block">
                <span className="field-label">وضعیت سفارش</span>
                <select className="field-input text-caption" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">وضعیت پرداخت</span>
                <select
                  className="field-input text-caption"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>
        </div>
      </div>

      {error && <p className="text-caption text-error">{error}</p>}
      {message && <p className="text-caption text-success">{message}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </button>
        {paid && (
          <button
            type="button"
            disabled={smsPending}
            onClick={() => void onResendSms()}
            className="btn btn-secondary w-full sm:w-auto"
          >
            {smsPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ارسال مجدد پیامک
          </button>
        )}
        <Link href="/admin/commerce/orders" className="btn btn-secondary w-full sm:w-auto">
          بازگشت
        </Link>
        <Link href="/admin/commerce/orders/reports" className="btn btn-secondary w-full sm:w-auto">
          گزارش سفارشات
        </Link>
      </div>
    </form>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'paid' || status === 'fulfilled' ? 'success' : status === 'failed' || status === 'cancelled' ? 'warning' : 'accent';
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
