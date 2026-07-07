import type { Metadata } from 'next';
import { ProfileForm } from '@/components/student-panel/profile/ProfileForm';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = { title: 'پروفایل | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelProfilePage() {
  const user = await getCurrentStudent();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-text">پروفایل</h1>
      <div className="card p-6">{user ? <ProfileForm user={user} /> : null}</div>
    </div>
  );
}
