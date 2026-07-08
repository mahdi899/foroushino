'use client';

import { useActionState, useState } from 'react';
import { sendOtpAction, verifyOtpAction, loginPasswordAction, type OtpAuthState, type PasswordAuthState } from '@/lib/student/actions';
import { MobileField } from './MobileField';

const OTP_INITIAL: OtpAuthState = { step: 'mobile' };
const PASSWORD_INITIAL: PasswordAuthState = {};

export function LoginForm() {
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [otpMobileValid, setOtpMobileValid] = useState(false);
  const [passwordMobileValid, setPasswordMobileValid] = useState(false);
  const [otpSubmitAttempted, setOtpSubmitAttempted] = useState(false);
  const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);
  const [otpState, sendOtp] = useActionState(sendOtpAction, OTP_INITIAL);
  const [verifyState, verifyOtp] = useActionState(verifyOtpAction, OTP_INITIAL);
  const [passwordState, loginPassword] = useActionState(loginPasswordAction, PASSWORD_INITIAL);

  const state = verifyState.mobile ? verifyState : otpState;

  function blockInvalidMobile(
    e: React.FormEvent<HTMLFormElement>,
    valid: boolean,
    setAttempted: (value: boolean) => void,
  ) {
    if (!valid) {
      e.preventDefault();
      setAttempted(true);
    }
  }

  if (mode === 'password') {
    return (
      <form
        action={loginPassword}
        className="flex flex-col gap-4"
        onSubmit={(e) => blockInvalidMobile(e, passwordMobileValid, setPasswordSubmitAttempted)}
      >
        <MobileField
          id="mobile-pw"
          onValidityChange={setPasswordMobileValid}
          showErrors={passwordSubmitAttempted}
        />
        <div>
          <label className="field-label" htmlFor="password">رمز عبور</label>
          <input id="password" name="password" type="password" className="field-input" required />
        </div>
        {passwordState.error ? <p className="text-sm text-error">{passwordState.error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={!passwordMobileValid}>
          ورود
        </button>
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
    <form
      action={sendOtp}
      className="flex flex-col gap-4"
      onSubmit={(e) => blockInvalidMobile(e, otpMobileValid, setOtpSubmitAttempted)}
    >
      <MobileField
        id="mobile"
        autoFocus
        onValidityChange={setOtpMobileValid}
        showErrors={otpSubmitAttempted}
      />
      {otpState.error ? <p className="text-sm text-error">{otpState.error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={!otpMobileValid}>
        دریافت کد ورود
      </button>
      <button type="button" onClick={() => setMode('password')} className="btn btn-ghost text-sm">
        ورود با رمز عبور
      </button>
    </form>
  );
}
