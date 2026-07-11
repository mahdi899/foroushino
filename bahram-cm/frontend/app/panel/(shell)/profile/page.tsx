import type { Metadata } from 'next';
import { ProfileForm } from '@/components/student-panel/profile/ProfileForm';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = { title: 'پروفایل | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelProfilePage() {
  const user = await getCurrentStudent();

  return (
    <div className="panel-page-inner panel-page-inner--profile">
      {user ? <ProfileForm user={user} /> : null}
    </div>
  );
}
