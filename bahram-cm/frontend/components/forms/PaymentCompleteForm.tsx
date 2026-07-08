"use client";

import { Loader2, Mail, Phone, User2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { completeOrderProfileAction } from "@/lib/checkout/actions";
import {
  buildCustomerName,
  isCompleteCustomerName,
} from "@/lib/checkout/productFields";
import { useStudentAuthOptional } from "@/components/student-panel/auth/StudentAuthContext";
import {
  PaymentCompleteLoggedInSuccess,
  PaymentCompleteLoginStep,
} from "@/components/forms/PaymentCompleteLoginStep";
import { cn } from "@/lib/cn";
import type { StudentUser } from "@/lib/student/session";

type Props = {
  completionToken: string;
  orderNumber: string;
  phoneMasked: string | null;
  initialEmail?: string | null;
  student: StudentUser | null;
};

type SuccessState = {
  postLoginToken: string | null;
  phoneMasked: string | null;
  otpSent: boolean;
};

export function PaymentCompleteForm({
  completionToken,
  orderNumber,
  phoneMasked,
  initialEmail,
  student,
}: Props) {
  const formId = useId();
  const auth = useStudentAuthOptional();
  const loggedIn = Boolean(student) || (auth?.isLoggedIn ?? false);
  const profileName = useMemo(
    () => (student ? buildCustomerName(student.profile, student.name) : ""),
    [student],
  );
  const hasCompleteName = isCompleteCustomerName(profileName);

  const [name, setName] = useState(hasCompleteName ? profileName : "");
  const [email, setEmail] = useState(initialEmail ?? student?.profile?.email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitted = useRef(false);

  async function submitProfile(customerName: string, customerEmail?: string) {
    setSubmitting(true);
    setServerError(null);

    const result = await completeOrderProfileAction({
      completion_token: completionToken,
      customer_name: customerName.trim(),
      customer_email: customerEmail?.trim() || undefined,
    });

    setSubmitting(false);

    if (!result.ok) {
      setServerError(result.error);
      return false;
    }

    setSuccess({
      postLoginToken: result.post_login_token,
      phoneMasked: result.customer_phone_masked ?? phoneMasked,
      otpSent: result.otp_sent,
    });

    return true;
  }

  useEffect(() => {
    if (!loggedIn || !hasCompleteName || autoSubmitted.current || success) return;
    autoSubmitted.current = true;
    void submitProfile(profileName, email);
  }, [loggedIn, hasCompleteName, profileName, email, success]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const found: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) found.name = "نام را کامل وارد کن.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    await submitProfile(name, email);
  }

  if (success) {
    return (
      <div className="rounded-tile border border-emerald/25 bg-emerald/8 px-4 py-4 text-sm text-bone">
        {loggedIn || !success.postLoginToken ? (
          <PaymentCompleteLoggedInSuccess phoneMasked={success.phoneMasked} />
        ) : (
          <PaymentCompleteLoginStep
            postLoginToken={success.postLoginToken}
            phoneMasked={success.phoneMasked}
            otpSent={success.otpSent}
          />
        )}
      </div>
    );
  }

  if (loggedIn && hasCompleteName) {
    return (
      <div className="space-y-4 text-sm text-bone">
        <div className="rounded-tile border border-bone/10 bg-ink/40 p-4">
          <p className="text-caption text-mist">اطلاعات حساب شما</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 text-emerald-glow" strokeWidth={1.5} aria-hidden />
              <span>{profileName}</span>
            </div>
            {student?.mobile ? (
              <div className="flex items-center gap-2 text-bone-dim" dir="ltr">
                <Phone className="h-4 w-4 text-emerald-glow" strokeWidth={1.5} aria-hidden />
                <span>{student.mobile}</span>
              </div>
            ) : null}
          </div>
        </div>
        <p className="text-caption text-mist">
          شماره سفارش: <span className="num-latin text-bone-dim">{orderNumber}</span>
        </p>
        {submitting ? (
          <div className="flex items-center justify-center gap-2 py-4 text-bone-dim">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال فعال‌سازی دسترسی…
          </div>
        ) : null}
        {serverError ? (
          <p role="alert" className="rounded-tile border border-gold/30 bg-gold/8 px-4 py-3 text-gold">
            {serverError}
          </p>
        ) : null}
      </div>
    );
  }

  if (loggedIn && student) {
    return (
      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <div className="rounded-tile border border-bone/10 bg-ink/40 p-4">
          <p className="text-caption text-mist">اطلاعات حساب شما</p>
          <div className="mt-3 space-y-2 text-sm">
            {student.mobile ? (
              <div className="flex items-center gap-2 text-bone-dim" dir="ltr">
                <Phone className="h-4 w-4 text-emerald-glow" strokeWidth={1.5} aria-hidden />
                <span>{student.mobile}</span>
              </div>
            ) : null}
            <p className="text-caption text-mist">
              شماره سفارش: <span className="num-latin text-bone-dim">{orderNumber}</span>
            </p>
          </div>
        </div>

        <p className="text-sm text-bone-dim">فقط نام خود را وارد کن تا دسترسی‌ات فعال شود.</p>

        <label htmlFor={`${formId}-name`} className="block">
          <span className="block text-caption text-bone">نام و نام خانوادگی</span>
          <span className="relative mt-2 block">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
              <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
            <input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((er) => ({ ...er, name: "" }));
              }}
              autoFocus
              className={cn(
                "block h-12 w-full rounded-pill border bg-ink/60 px-4 ps-10 text-bone focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
                errors.name ? "border-gold/60" : "border-bone/12",
              )}
            />
          </span>
          {errors.name ? <span className="mt-1.5 block text-caption text-gold">{errors.name}</span> : null}
        </label>

        <label htmlFor={`${formId}-email`} className="block">
          <span className="block text-caption text-bone">ایمیل (اختیاری)</span>
          <span className="relative mt-2 block">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
              <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
            <input
              id={`${formId}-email`}
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block h-12 w-full rounded-pill border border-bone/12 bg-ink/60 px-4 ps-10 text-bone focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40"
            />
          </span>
        </label>

        {serverError ? (
          <p role="alert" className="rounded-tile border border-gold/30 bg-gold/8 px-4 py-3 text-gold">
            {serverError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="neon-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ذخیره و ادامه
        </button>
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      <p className="text-sm text-bone-dim">فقط نام خود را وارد کن تا دسترسی‌ات فعال شود.</p>

      {phoneMasked ? (
        <div className="flex items-center gap-3 rounded-tile border border-bone/10 bg-ink/40 px-4 py-3 text-sm">
          <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0">
            <p className="text-caption text-mist">شماره ثبت‌شده در خرید</p>
            <p className="mt-0.5 font-medium text-bone" dir="ltr">
              {phoneMasked}
            </p>
          </div>
        </div>
      ) : null}

      <p className="text-caption text-mist">
        شماره سفارش: <span className="num-latin text-bone-dim">{orderNumber}</span>
      </p>

      <label htmlFor={`${formId}-name`} className="block">
        <span className="block text-caption text-bone">نام و نام خانوادگی</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((er) => ({ ...er, name: "" }));
            }}
            autoFocus
            className={cn(
              "block h-12 w-full rounded-pill border bg-ink/60 px-4 ps-10 text-bone focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
              errors.name ? "border-gold/60" : "border-bone/12",
            )}
          />
        </span>
        {errors.name ? <span className="mt-1.5 block text-caption text-gold">{errors.name}</span> : null}
      </label>

      <label htmlFor={`${formId}-email`} className="block">
        <span className="block text-caption text-bone">ایمیل (اختیاری)</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-email`}
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block h-12 w-full rounded-pill border border-bone/12 bg-ink/60 px-4 ps-10 text-bone focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40"
          />
        </span>
      </label>

      {serverError ? (
        <p role="alert" className="rounded-tile border border-gold/30 bg-gold/8 px-4 py-3 text-gold">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="neon-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-6 font-semibold hover:bg-emerald-glow disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        ذخیره و ادامه
      </button>
    </form>
  );
}
