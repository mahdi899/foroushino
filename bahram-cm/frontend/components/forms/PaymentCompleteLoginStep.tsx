'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OtpDigitInput } from '@/components/student-panel/auth/OtpDigitInput';
import { useStudentAuth } from '@/components/student-panel/auth/StudentAuthContext';
import { postPaymentResendOtpAction, postPaymentVerifyOtpAction } from '@/lib/checkout/actions';

const RESEND_SECONDS = 60;

type Props = {
  postLoginToken: string;
  phoneMasked: string | null;
  otpSent: boolean;
  embedded?: boolean;
};

export function PaymentCompleteLoginStep({
  postLoginToken,
  phoneMasked,
  otpSent,
  embedded = false,
}: Props) {
  const router = useRouter();
  const { markLoggedIn } = useStudentAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    otpSent ? 'کد تأیید به شماره ثبت‌شده در خرید ارسال شد.' : null,
  );
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(otpSent ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function verifyOtp(otp: string) {
    if (verifying) return;
    setVerifying(true);
    setError(null);

    const result = await postPaymentVerifyOtpAction(postLoginToken, otp);
    setVerifying(false);

    if (!result.ok) {
      setError(result.error);
      setCode('');
      return;
    }

    markLoggedIn();
    router.push('/panel');
  }

  async function handleResend() {
    if (resendIn > 0 || resending) return;
    setResending(true);
    setError(null);

    const result = await postPaymentResendOtpAction(postLoginToken);
    setResending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setInfo('کد جدید ارسال شد.');
    setResendIn(RESEND_SECONDS);
    setCode('');
  }

  return (
    <div className={embedded ? "payment-complete-form__success-state" : "space-y-4"}>
      <div className="payment-complete-form__success-copy">
        <p className="payment-complete-form__success-title">اطلاعات با موفقیت ثبت شد.</p>
        <p className="payment-complete-form__success-body">
          برای ورود به پنل، کد تأیید ارسال‌شده{phoneMasked ? ` به ${phoneMasked}` : ""} را وارد کن.
        </p>
      </div>

      {info ? <p className="payment-complete-form__success-hint">{info}</p> : null}

      <div className="payment-complete-form__otp-wrap">
        <OtpDigitInput
          value={code}
          onChange={setCode}
          onComplete={verifyOtp}
          disabled={verifying}
          error={Boolean(error)}
          autoFocus
        />
      </div>

      {error ? (
        <p role="alert" className="payment-complete-form__error">
          {error}
        </p>
      ) : null}

      <div className="payment-complete-form__otp-actions flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendIn > 0 || resending}
          className="text-caption text-emerald-glow underline-offset-2 hover:underline disabled:opacity-50"
        >
          {resending ? 'در حال ارسال…' : resendIn > 0 ? `ارسال مجدد (${resendIn})` : 'ارسال مجدد کد'}
        </button>

        {verifying ? (
          <span className="inline-flex items-center gap-2 text-caption text-mist">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            در حال ورود…
          </span>
        ) : null}
      </div>
    </div>
  );
}

type LoggedInSuccessProps = {
  phoneMasked: string | null;
  embedded?: boolean;
};

export function PaymentCompleteLoggedInSuccess({
  phoneMasked,
  embedded = false,
}: LoggedInSuccessProps) {
  return (
    <div className={embedded ? "payment-complete-form__success-state" : "space-y-3"}>
      <div className="payment-complete-form__success-copy">
        <p className="payment-complete-form__success-title">اطلاعات با موفقیت ثبت شد.</p>
        <p className="payment-complete-form__success-body">اکنون می‌توانی وارد پنل کاربری شوی.</p>
      </div>

      {phoneMasked ? (
        <div className="payment-complete-form__success-phone">
          <span className="payment-complete-form__success-phone-label">شماره ثبت‌شده</span>
          <span className="payment-complete-form__success-phone-value num-latin" dir="ltr">
            {phoneMasked}
          </span>
        </div>
      ) : null}

      <Link
        href="/panel"
        className="payment-result-card__primary payment-complete-form__submit neon-btn-primary inline-flex h-12 w-full max-w-[14rem] items-center justify-center rounded-pill font-semibold"
      >
        ورود به پنل
      </Link>
    </div>
  );
}
