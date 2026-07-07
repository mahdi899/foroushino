import { AdminPage } from '../../ui';
import { ImportStudentsPanel } from './ImportStudentsPanel';

export const dynamic = 'force-dynamic';

export default function ImportsPage() {
  return (
    <AdminPage title="ورود اطلاعات (Import)" desc="وارد کردن دسته‌ای دانشجویان با پیش‌نمایش قبل از ثبت نهایی">
      <ImportStudentsPanel />
    </AdminPage>
  );
}
