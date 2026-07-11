import { Sparkles } from 'lucide-react';
import { ProfileCardHead } from '@/components/student-panel/profile/ProfileCardHead';
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
          {collectAge ? (
            <div className="panel-profile-field">
              <label className="field-label" htmlFor="age">
                سن
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min={10}
                max={120}
                defaultValue={profile?.age ?? ''}
                className="field-input"
              />
            </div>
          ) : null}
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
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="experience_level">
              سطح تجربه
            </label>
            <input
              id="experience_level"
              name="experience_level"
              defaultValue={profile?.experience_level ?? ''}
              className="field-input"
              placeholder="مثلاً: مبتدی، متوسط، حرفه‌ای"
            />
          </div>
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
