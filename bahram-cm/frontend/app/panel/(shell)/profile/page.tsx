import type { Metadata } from 'next';
import { User } from 'lucide-react';
import { ProfileForm } from '@/components/student-panel/profile/ProfileForm';
import { AccountVerificationCard } from '@/components/student-panel/profile/AccountVerificationCard';
import { ReferenceChannelCard } from '@/components/student-panel/profile/ReferenceChannelCard';
import { SatAccessCard } from '@/components/student-panel/profile/SatAccessCard';
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
        variant="profile"
      />
      {user ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <AccountVerificationCard user={user} />
            <ReferenceChannelCard user={user} />
            <SatAccessCard user={user} />
          </div>
          <ProfileForm user={user} />
        </>
      ) : null}
    </div>
  );
}
