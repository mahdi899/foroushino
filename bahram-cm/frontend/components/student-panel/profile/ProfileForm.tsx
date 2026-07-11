'use client';

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { ProfileAvatarField } from '@/components/student-panel/profile/ProfileAvatarField';
import { ProfileAccountOverview } from '@/components/student-panel/profile/ProfileAccountOverview';
import { ProfileCardHead } from '@/components/student-panel/profile/ProfileCardHead';
import { ProfileExtrasBundle } from '@/components/student-panel/profile/ProfileExtrasBundle';
import { VerifiedIdentitySection } from '@/components/student-panel/profile/VerifiedIdentitySection';
import { resolveAccountTier } from '@/lib/student/accountTier';
import { cn } from '@/lib/cn';
import { updateProfileAction, type SimpleFormState } from '@/lib/student/panelActions';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';
import {
  buildProfileFormSnapshot,
  isProfileFormDirty,
  readProfileFormSnapshot,
} from '@/lib/student/profileFormDirty';
import { profileCompletion } from '@/lib/student/profileCompletion';
import type { StudentUser } from '@/lib/student/session';

const INITIAL: SimpleFormState = {};

export function ProfileForm({ user }: { user: StudentUser }) {
  const [state, action, isPending] = useActionState(updateProfileAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const profile = user.profile;
  const completion = useMemo(() => profileCompletion(user), [user]);
  const accountTier = useMemo(() => resolveAccountTier(user), [user]);
  const initialSnapshot = useMemo(() => buildProfileFormSnapshot(user), [user]);

  usePanelFormFeedback(state, {
    successTitle: 'ذخیره شد',
    errorTitle: 'ذخیره ناموفق',
  });

  const syncDirtyState = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const current = readProfileFormSnapshot(new FormData(form));
    setDirty(isProfileFormDirty(initialSnapshot, current));
  }, [initialSnapshot]);

  const scheduleDirtyCheck = useCallback(() => {
    queueMicrotask(() => syncDirtyState());
  }, [syncDirtyState]);

  useEffect(() => {
    setDirty(false);
  }, [initialSnapshot]);

  useEffect(() => {
    if (state.success) {
      setDirty(false);
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="panel-profile-form"
      onChange={syncDirtyState}
      onInput={syncDirtyState}
    >
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
              <button
                type="submit"
                className={cn(
                  'btn panel-profile-footer__submit',
                  dirty ? 'btn-primary panel-profile-footer__submit--dirty' : 'panel-profile-footer__submit--idle',
                )}
                disabled={!dirty || isPending}
              >
                {isPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
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

          <ProfileExtrasBundle user={user} onFieldChange={scheduleDirtyCheck} />
          </div>
        </div>
      </div>
    </form>
  );
}
