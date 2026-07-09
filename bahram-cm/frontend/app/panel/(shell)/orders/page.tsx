import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { StudentOrdersList, type StudentOrder } from '@/components/student-panel/orders/StudentOrdersList';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'سفارش‌های من | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelOrdersPage() {
  const { data: orders } = await panelStudentFetch<{ data: StudentOrder[] }>('/orders');

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader
        icon={Receipt}
        title="سفارش‌های من"
        description="تاریخچه خریدها، پرداخت‌ها و وضعیت سفارش‌ها"
      />
      <StudentOrdersList orders={orders} />
    </div>
  );
}
