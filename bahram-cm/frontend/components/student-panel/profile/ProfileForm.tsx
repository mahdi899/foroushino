'use client';

import { useActionState, useMemo } from 'react';
import { UserRound } from 'lucide-react';
import { ProfileAvatarField } from '@/components/student-panel/profile/ProfileAvatarField';
import { ProfileAccountOverview } from '@/components/student-panel/profile/ProfileAccountOverview';
import { ProfileCardHead } from '@/components/student-panel/profile/ProfileCardHead';
import { ProfileExtrasBundle } from '@/components/student-panel/profile/ProfileExtrasBundle';
import { VerifiedIdentitySection } from '@/components/student-panel/profile/VerifiedIdentitySection';
import { resolveAccountTier } from '@/lib/student/accountTier';
import { cn } from '@/lib/cn';
import { updateProfileAction, type SimpleFormState } from '@/lib/student/panelActions';
import { profileCompletion } from '@/lib/student/profileCompletion';
import type { StudentUser } from '@/lib/student/session';

const INITIAL: SimpleFormState = {};

export function ProfileForm({ user }: { user: StudentUser }) {
  const [state, action] = useActionState(updateProfileAction, INITIAL);
  const profile = user.profile;
  const completion = useMemo(() => profileCompletion(user), [user]);
  const accountTier = useMemo(() => resolveAccountTier(user), [user]);

  return (
    <form action={action} className="panel-profile-form">
      <div className="panel-profile-layout">
        <aside className="panel-profile-aside">
          <div className="panel-profile-aside__sticky">
            <div
              className={cn(
                'card panel-profile-aside__card',
                accountTier.variant === 'identity' && 'panel-profile-aside__card--tier-2',
                accountTier.variant === 'full' && 'panel-profile-aside__card--tier-3',
              )}
            >
              <ProfileAvatarField user={user} profileCompletion={completion} accountTier={accountTier} />

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

            <div className="card panel-profile-footer">
              <div className="panel-profile-footer__messages">
                {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
                {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
              </div>
              <button type="submit" className="btn btn-primary panel-profile-footer__submit">
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </aside>

        <div className="panel-profile-main">
          <div className="panel-profile-sections">
          <ProfileAccountOverview user={user} />

          <section className="card panel-profile-basic panel-profile-section--wide">
            <ProfileCardHead icon={UserRound} title="اطلاعات پایه" />
            <div className="panel-profile-card-body">
              <div className="panel-profile-grid panel-profile-grid--wide">
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
              </div>
            </div>
          </section>

          <VerifiedIdentitySection user={user} />

          <ProfileExtrasBundle user={user} />
          </div>
        </div>
      </div>
    </form>
  );
}
