'use client';

import { useActionState, useMemo } from 'react';
import { Lock, MapPin, Sparkles, UserRound } from 'lucide-react';
import { ProfileAvatarField } from '@/components/student-panel/profile/ProfileAvatarField';
import { updateProfileAction, type SimpleFormState } from '@/lib/student/panelActions';
import type { StudentUser } from '@/lib/student/session';

const INITIAL: SimpleFormState = {};

function profileCompletion(user: StudentUser): number {
  const profile = user.profile;
  const checks = [
    Boolean(profile?.avatar_url || profile?.avatar),
    Boolean(user.name?.trim()),
    Boolean(profile?.first_name?.trim()),
    Boolean(profile?.last_name?.trim()),
    Boolean(profile?.email?.trim()),
    Boolean(profile?.city?.trim()),
    Boolean(profile?.age),
    Boolean(profile?.current_job?.trim()),
    Boolean(profile?.instagram?.trim()),
    Boolean(profile?.telegram?.trim()),
    Boolean(profile?.experience_level?.trim()),
    Boolean(profile?.income_goal?.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function ProfileSection({
  icon: Icon,
  title,
  description,
  tone,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  tone: 'profile' | 'location' | 'social' | 'lock';
  children: React.ReactNode;
}) {
  return (
    <section className="panel-profile-section">
      <header className="panel-profile-section__header">
        <span className={`panel-profile-section__icon panel-profile-section__icon--${tone}`} aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <h2 className="panel-profile-section__title">{title}</h2>
          <p className="panel-profile-section__desc">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function ProfileForm({ user }: { user: StudentUser }) {
  const [state, action] = useActionState(updateProfileAction, INITIAL);
  const profile = user.profile;
  const completion = useMemo(() => profileCompletion(user), [user]);

  return (
    <form action={action} className="panel-profile-form">
      <div className="panel-profile-layout">
        <aside className="panel-profile-aside">
          <div className="panel-profile-aside__card">
            <ProfileAvatarField user={user} />
            <div className="panel-profile-progress">
              <div className="panel-profile-progress__meta">
                <span className="panel-profile-progress__label">تکمیل پروفایل</span>
                <span className="panel-profile-progress__value">{completion.toLocaleString('fa-IR')}٪</span>
              </div>
              <div className="panel-profile-progress__track">
                <div className="panel-profile-progress__bar" style={{ width: `${completion}%` }} />
              </div>
              <p className="panel-profile-progress__hint">
                {completion >= 100
                  ? 'عالی! پروفایل شما کامل است.'
                  : 'هرچه پروفایل کامل‌تر باشد، تجربه شخصی‌سازی‌شده‌تری دریافت می‌کنید.'}
              </p>
            </div>
          </div>
        </aside>

        <div className="panel-profile-main">
          <ProfileSection
            icon={UserRound}
            title="اطلاعات پایه"
            description="نام و راه‌های ارتباطی که در پنل و پشتیبانی استفاده می‌شود."
            tone="profile"
          >
            <div className="panel-profile-grid">
              <div className="panel-profile-field">
                <label className="field-label" htmlFor="name">
                  نام نمایشی
                </label>
                <input id="name" name="name" defaultValue={user.name} className="field-input" />
              </div>
              <div className="panel-profile-field">
                <label className="field-label">شماره موبایل</label>
                <input value={user.mobile} disabled className="field-input opacity-70" dir="ltr" />
              </div>
              <div className="panel-profile-field">
                <label className="field-label" htmlFor="first_name">
                  نام
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  defaultValue={profile?.first_name ?? ''}
                  className="field-input"
                />
              </div>
              <div className="panel-profile-field">
                <label className="field-label" htmlFor="last_name">
                  نام خانوادگی
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  defaultValue={profile?.last_name ?? ''}
                  className="field-input"
                />
              </div>
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
                <label className="field-label" htmlFor="city">
                  شهر
                </label>
                <input id="city" name="city" defaultValue={profile?.city ?? ''} className="field-input" />
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            icon={MapPin}
            title="وضعیت حرفه‌ای"
            description="به ما کمک کنید مسیر آموزشی مناسب‌تری پیشنهاد دهیم."
            tone="location"
          >
            <div className="panel-profile-grid">
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
            </div>
          </ProfileSection>

          <ProfileSection
            icon={Sparkles}
            title="شبکه‌های اجتماعی و اهداف"
            description="اختیاری — برای ارتباط بهتر و پیشنهادهای دقیق‌تر."
            tone="social"
          >
            <div className="panel-profile-grid">
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
          </ProfileSection>

          <ProfileSection
            icon={Lock}
            title={user.has_password ? 'تغییر رمز عبور' : 'تنظیم رمز عبور'}
            description="برای ورود امن‌تر با ایمیل یا نام کاربری."
            tone="lock"
          >
            <div className="panel-profile-grid panel-profile-grid--compact">
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
          </ProfileSection>

          <div className="panel-profile-footer">
            {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
            {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
            <button type="submit" className="btn btn-primary min-w-[10rem]">
              ذخیره تغییرات
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
