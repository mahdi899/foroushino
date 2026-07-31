import { Sparkles } from 'lucide-react';
import { ProfileAgeField } from '@/components/student-panel/profile/ProfileAgeField';
import { ProfileCardHead } from '@/components/student-panel/profile/ProfileCardHead';
import { ProfileExperienceField } from '@/components/student-panel/profile/ProfileExperienceField';
import { ProfileIncomeGoalField } from '@/components/student-panel/profile/ProfileIncomeGoalField';
import { ProfilePasswordFields } from '@/components/student-panel/profile/ProfilePasswordFields';
import { shouldCollectProfileAge } from '@/lib/student/age';
import type { StudentUser } from '@/lib/student/session';

export function ProfileExtrasBundle({
  user,
  onFieldChange,
}: {
  user: StudentUser;
  onFieldChange?: () => void;
}) {
  const profile = user.profile;
  const collectAge = shouldCollectProfileAge(user);

  return (
    <section className="card panel-profile-bundle">
      <ProfileCardHead icon={Sparkles} title="اطلاعات تکمیلی" />

      <div className="panel-profile-card-body panel-profile-card-body--stacked">
        <div className="panel-profile-grid panel-profile-grid--bundle">
          {collectAge ? <ProfileAgeField defaultValue={profile?.age} onChange={onFieldChange} /> : null}
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="email">
              ایمیل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? ''}
              className="field-input"
              dir="ltr"
            />
          </div>
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="current_job">
              شغل فعلی
            </label>
            <input
              id="current_job"
              name="current_job"
              defaultValue={profile?.current_job ?? ''}
              className="field-input"
            />
          </div>
          <ProfileExperienceField defaultValue={profile?.experience_level} onChange={onFieldChange} />
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="instagram">
              اینستاگرام
            </label>
            <input
              id="instagram"
              name="instagram"
              defaultValue={profile?.instagram ?? ''}
              className="field-input"
              dir="ltr"
              placeholder="@username"
            />
          </div>
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="telegram">
              تلگرام
            </label>
            <input
              id="telegram"
              name="telegram"
              defaultValue={profile?.telegram ?? ''}
              className="field-input"
              dir="ltr"
              placeholder="@username"
            />
          </div>
          <ProfileIncomeGoalField defaultValue={profile?.income_goal} onChange={onFieldChange} />
        </div>

        <div className="panel-profile-bundle__divider" aria-hidden />

        <ProfilePasswordFields hasPassword={user.has_password} mobile={user.mobile} onFieldChange={onFieldChange} />
      </div>
    </section>
  );
}
