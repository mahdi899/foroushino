import type { Metadata } from 'next';
import { User } from 'lucide-react';
import { ProfileForm } from '@/components/student-panel/profile/ProfileForm';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = { title: 'پروفایل | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelProfilePage() {
  const user = await getCurrentStudent();

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={User}
        title="پروفایل"
        description="اطلاعات فردی و مسیر یادگیری خود را کامل نگه دارید."
      />
      <div className="card w-full p-5 sm:p-6 lg:p-8">{user ? <ProfileForm user={user} /> : null}</div>
    </div>
  );
}
