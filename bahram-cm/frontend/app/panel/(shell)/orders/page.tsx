import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'سفارش‌های من | پنل کاربری', robots: { index: false, follow: false } };

interface Order {
  id: number;
  order_number: string;
  product_title: string | null;
  final_amount: number;
  status: string;
  payment_status: string;
  created_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  fulfilled: 'تکمیل‌شده',
  failed: 'ناموفق',
};

export default async function PanelOrdersPage() {
  const { data: orders } = await studentFetch<{ data: Order[] }>('/orders');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold text-text">سفارش‌های من</h1>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Receipt size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-text">{order.product_title ?? 'محصول'}</p>
                <p className="mt-1 text-xs text-text-muted" dir="ltr">
                  {order.order_number}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-text">{order.final_amount.toLocaleString('fa-IR')} تومان</p>
                <span className="badge badge-neutral mt-1">{STATUS_LABELS[order.status] ?? order.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
