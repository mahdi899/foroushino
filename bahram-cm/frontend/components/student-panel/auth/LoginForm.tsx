'use client';

import { useActionState, useState } from 'react';
import { sendOtpAction, verifyOtpAction, loginPasswordAction, type OtpAuthState, type PasswordAuthState } from '@/lib/student/actions';

const OTP_INITIAL: OtpAuthState = { step: 'mobile' };
const PASSWORD_INITIAL: PasswordAuthState = {};

export function LoginForm() {
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [otpState, sendOtp] = useActionState(sendOtpAction, OTP_INITIAL);
  const [verifyState, verifyOtp] = useActionState(verifyOtpAction, OTP_INITIAL);
  const [passwordState, loginPassword] = useActionState(loginPasswordAction, PASSWORD_INITIAL);

  const state = verifyState.mobile ? verifyState : otpState;

  if (mode === 'password') {
    return (
      <form action={loginPassword} className="flex flex-col gap-4">
        <div>
          <label className="field-label" htmlFor="mobile-pw">شماره موبایل</label>
          <input id="mobile-pw" name="mobile" type="tel" inputMode="numeric" placeholder="09xxxxxxxxx" className="field-input" required dir="ltr" />
        </div>
        <div>
          <label className="field-label" htmlFor="password">رمز عبور</label>
          <input id="password" name="password" type="password" className="field-input" required />
        </div>
        {passwordState.error ? <p className="text-sm text-error">{passwordState.error}</p> : null}
        <button type="submit" className="btn btn-primary">ورود</button>
        <button type="button" onClick={() => setMode('otp')} className="btn btn-ghost text-sm">
          ورود با کد یک‌بارمصرف
        </button>
      </form>
    );
  }

  if (state.step === 'otp' && state.mobile) {
    return (
      <form action={verifyOtp} className="flex flex-col gap-4">
        <input type="hidden" name="mobile" value={state.mobile} />
        <p className="text-sm text-text-muted">
          کد تایید برای شماره <span dir="ltr" className="font-semibold text-text">{state.mobile}</span> پیامک شد.
        </p>
        <div>
          <label className="field-label" htmlFor="code">کد تایید</label>
          <input id="code" name="code" inputMode="numeric" maxLength={5} className="field-input text-center tracking-[0.5em]" required dir="ltr" autoFocus />
        </div>
        {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
        <button type="submit" className="btn btn-primary">تایید و ورود</button>
      </form>
    );
  }

  return (
    <form action={sendOtp} className="flex flex-col gap-4">
      <div>
        <label className="field-label" htmlFor="mobile">شماره موبایل</label>
        <input id="mobile" name="mobile" type="tel" inputMode="numeric" placeholder="09xxxxxxxxx" className="field-input" required dir="ltr" autoFocus />
      </div>
      {otpState.error ? <p className="text-sm text-error">{otpState.error}</p> : null}
      <button type="submit" className="btn btn-primary">دریافت کد ورود</button>
      <button type="button" onClick={() => setMode('password')} className="btn btn-ghost text-sm">
        ورود با رمز عبور
      </button>
    </form>
  );
}
