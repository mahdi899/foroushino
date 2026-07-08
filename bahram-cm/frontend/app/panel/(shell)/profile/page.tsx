import type { Metadata } from 'next';
import { UserRound } from 'lucide-react';
import { ProfileForm } from '@/components/student-panel/profile/ProfileForm';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = { title: 'پروفایل | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelProfilePage() {
  const user = await getCurrentStudent();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <UserRound size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text">پروفایل</h1>
          <p className="text-sm text-text-muted">اطلاعات فردی و مسیر یادگیری خود را کامل نگه دارید.</p>
        </div>
      </div>
      <div className="card p-5 sm:p-6">{user ? <ProfileForm user={user} /> : null}</div>
    </div>
  );
}
