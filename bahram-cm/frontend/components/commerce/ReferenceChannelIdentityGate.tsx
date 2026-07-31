"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStudentAuthOptional } from "@/components/student-panel/auth/StudentAuthContext";
import { loginFromPaymentReceiptAction } from "@/lib/checkout/actions";

const IDENTITY_HREF = "/panel/identity-verification";
const AUTO_REDIRECT_SECONDS = 10;

type Props = {
  receiptToken: string;
  isLoggedIn: boolean;
};

export function ReferenceChannelIdentityGate({ receiptToken, isLoggedIn }: Props) {
  const router = useRouter();
  const auth = useStudentAuthOptional();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(AUTO_REDIRECT_SECONDS);
  const startedRef = useRef(false);

  const alreadyLoggedIn = isLoggedIn || (auth?.isLoggedIn ?? false);

  const goToIdentity = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (alreadyLoggedIn) {
      router.push(IDENTITY_HREF);
      return;
    }

    setBusy(true);
    setError(null);

    const result = await loginFromPaymentReceiptAction(receiptToken);
    if (!result.ok) {
      startedRef.current = false;
      setBusy(false);
      setError(result.error);
      return;
    }

    if (result.needsProfileCompletion) {
      router.push(`/payment/complete?token=${encodeURIComponent(result.completionToken)}`);
      return;
    }

    auth?.markLoggedIn();
    router.push(IDENTITY_HREF);
  }, [alreadyLoggedIn, auth, receiptToken, router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining === 0) void goToIdentity();
  }, [remaining, goToIdentity]);

  return (
    <div className="flex w-full flex-col items-stretch gap-4">
      <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 p-5 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-gold" aria-hidden />
        <p className="mt-3 text-lg font-extrabold leading-snug md:text-xl">
          هنوز احراز هویت نکرده‌اید!
        </p>
        <p className="mt-2 text-sm leading-7 text-text-muted md:text-body">
          دسترسی به کانال مرجع فقط بعد از تکمیل احراز هویت فعال می‌شود. تا زمانی که احراز هویت شما
          تأیید نشود، لینک عضویت صادر نمی‌شود.
        </p>
        <p role="status" className="mt-3 text-sm font-semibold text-gold">
          تا <span className="num-latin">{remaining}</span> ثانیه‌ی دیگر به‌صورت خودکار به صفحه‌ی
          احراز هویت منتقل می‌شوید…
        </p>
      </div>

      <button
        type="button"
        onClick={() => void goToIdentity()}
        disabled={busy}
        className="payment-result-card__primary neon-btn-primary inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-pill px-7 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:text-body"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال انتقال…
          </>
        ) : (
          <>
            <ShieldAlert className="h-4 w-4" aria-hidden />
            همین حالا احراز هویت می‌کنم
          </>
        )}
      </button>

      {error ? (
        <p role="alert" className="text-center text-sm text-gold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
