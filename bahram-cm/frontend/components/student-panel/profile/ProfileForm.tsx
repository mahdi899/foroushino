'use client';

import { useActionState } from 'react';
import { ProfileAvatarField } from '@/components/student-panel/profile/ProfileAvatarField';
import { updateProfileAction, type SimpleFormState } from '@/lib/student/panelActions';
import type { StudentUser } from '@/lib/student/session';

const INITIAL: SimpleFormState = {};

export function ProfileForm({ user }: { user: StudentUser }) {
  const [state, action] = useActionState(updateProfileAction, INITIAL);
  const profile = user.profile;

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-border pb-6">
        <h2 className="text-base font-bold text-text">تصویر پروفایل</h2>
        <ProfileAvatarField user={user} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-text">اطلاعات پایه</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="name">نام نمایشی</label>
            <input id="name" name="name" defaultValue={user.name} className="field-input" />
          </div>
          <div>
            <label className="field-label">شماره موبایل</label>
            <input value={user.mobile} disabled className="field-input" dir="ltr" />
          </div>
          <div>
            <label className="field-label" htmlFor="first_name">نام</label>
            <input id="first_name" name="first_name" defaultValue={profile?.first_name ?? ''} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="last_name">نام خانوادگی</label>
            <input id="last_name" name="last_name" defaultValue={profile?.last_name ?? ''} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="email">ایمیل</label>
            <input id="email" name="email" type="email" defaultValue={profile?.email ?? ''} className="field-input" dir="ltr" />
          </div>
          <div>
            <label className="field-label" htmlFor="city">شهر</label>
            <input id="city" name="city" defaultValue={profile?.city ?? ''} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="age">سن</label>
            <input id="age" name="age" type="number" min={10} max={120} defaultValue={profile?.age ?? ''} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="current_job">شغل فعلی</label>
            <input id="current_job" name="current_job" defaultValue={profile?.current_job ?? ''} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="instagram">اینستاگرام</label>
            <input id="instagram" name="instagram" defaultValue={profile?.instagram ?? ''} className="field-input" dir="ltr" />
          </div>
          <div>
            <label className="field-label" htmlFor="telegram">تلگرام</label>
            <input id="telegram" name="telegram" defaultValue={profile?.telegram ?? ''} className="field-input" dir="ltr" />
          </div>
          <div>
            <label className="field-label" htmlFor="experience_level">سطح تجربه</label>
            <input id="experience_level" name="experience_level" defaultValue={profile?.experience_level ?? ''} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="income_goal">هدف درآمدی</label>
            <input id="income_goal" name="income_goal" defaultValue={profile?.income_goal ?? ''} className="field-input" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-base font-bold text-text">
          {user.has_password ? 'تغییر رمز عبور' : 'تنظیم رمز عبور'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="password">رمز عبور جدید</label>
            <input id="password" name="password" type="password" className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="password_confirmation">تکرار رمز عبور</label>
            <input id="password_confirmation" name="password_confirmation" type="password" className="field-input" />
          </div>
        </div>
      </section>

      {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <button type="submit" className="btn btn-primary self-start">ذخیره تغییرات</button>
    </form>
  );
}
