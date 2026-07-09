import type { Metadata } from 'next';
import { StudentOrdersList, type StudentOrder } from '@/components/student-panel/orders/StudentOrdersList';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'سفارش‌های من | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelOrdersPage() {
  const { data: orders } = await panelStudentFetch<{ data: StudentOrder[] }>('/orders');

  return (
    <div className="panel-page-inner panel-page-inner--md flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text">سفارش‌های من</h1>
      <StudentOrdersList orders={orders} />
    </div>
  );
}
