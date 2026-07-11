import { Sparkles } from 'lucide-react';
import { ProfileCardHead } from '@/components/student-panel/profile/ProfileCardHead';
import { shouldCollectProfileAge } from '@/lib/student/age';
import type { StudentUser } from '@/lib/student/session';

export function ProfileExtrasBundle({ user }: { user: StudentUser }) {
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
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="income_goal">
              هدف درآمدی
            </label>
            <input
              id="income_goal"
              name="income_goal"
              defaultValue={profile?.income_goal ?? ''}
              className="field-input"
              placeholder="مثلاً: ۵۰ میلیون تومان"
            />
          </div>
        </div>

        <div className="panel-profile-bundle__divider" aria-hidden />

        <div className="panel-profile-grid panel-profile-grid--bundle-password">
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="password">
              رمز عبور جدید
            </label>
            <input id="password" name="password" type="password" className="field-input" autoComplete="new-password" />
          </div>
          <div className="panel-profile-field">
            <label className="field-label" htmlFor="password_confirmation">
              تکرار رمز عبور
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              className="field-input"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
