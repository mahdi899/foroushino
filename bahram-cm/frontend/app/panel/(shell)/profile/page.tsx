import type { Metadata } from 'next';
import { ProfileForm } from '@/components/student-panel/profile/ProfileForm';
import { PanelProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { studentDefaultAvatarUrl } from '@/lib/student/avatar';
import { getCurrentStudent } from '@/lib/student/session';

export const metadata: Metadata = { title: 'پروفایل | پنل کاربری', robots: { index: false, follow: false } };

export default async function PanelProfilePage() {
  const user = await getCurrentStudent();
  const fullName = [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || user?.name || 'دانشجو';

  return (
    <div className="panel-page-inner panel-page-inner--sm flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {user ? (
          <PanelProfileAvatar
            avatar={user.profile?.avatar}
            avatarUrl={user.profile?.avatar_url}
            gravatarUrl={user.profile?.gravatar_url}
            defaultAvatarUrl={user.profile?.default_avatar_url ?? studentDefaultAvatarUrl(user.id, 96)}
            alt={displayName}
            className="h-12 w-12"
          />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary" />
        )}
        <div>
          <h1 className="text-xl font-bold text-text">پروفایل</h1>
          <p className="text-sm text-text-muted">اطلاعات فردی و مسیر یادگیری خود را کامل نگه دارید.</p>
        </div>
      </div>
      <div className="card p-5 sm:p-6">{user ? <ProfileForm user={user} /> : null}</div>
    </div>
  );
}
