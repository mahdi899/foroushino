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
  embedded?: boolean;
};

type SuccessState = {
  postLoginToken: string | null;
  phoneMasked: string | null;
  otpSent: boolean;
};

const fieldClass =
  "payment-complete-form__input block h-12 w-full rounded-pill border bg-ink/60 px-4 ps-10 text-bone focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40";

function NameEmailFieldsRow({
  formId,
  name,
  email,
  errors,
  onNameChange,
  onEmailChange,
}: {
  formId: string;
  name: string;
  email: string;
  errors: Record<string, string>;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}) {
  return (
    <div className="payment-complete-form__fields-row">
      <label htmlFor={`${formId}-name`} className="payment-complete-form__field min-w-0">
        <span className="payment-complete-form__label">نام و نام خانوادگی</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-name`}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoFocus
            className={cn(fieldClass, errors.name ? "border-gold/60" : "border-bone/12")}
          />
        </span>
      </label>

      <label htmlFor={`${formId}-email`} className="payment-complete-form__field min-w-0">
        <span className="payment-complete-form__label">ایمیل (اختیاری)</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-email`}
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className={cn(fieldClass, "border-bone/12")}
          />
        </span>
      </label>

      {errors.name ? (
        <span className="payment-complete-form__field-error payment-complete-form__field-error--span">
          {errors.name}
        </span>
      ) : null}
    </div>
  );
}

export function PaymentCompleteForm({
  completionToken,
  orderNumber,
  phoneMasked,
  initialEmail,
  student,
  embedded = false,
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
      <div className="payment-complete-form__success">
        {loggedIn || !success.postLoginToken ? (
          <PaymentCompleteLoggedInSuccess phoneMasked={success.phoneMasked} embedded={embedded} />
        ) : (
          <PaymentCompleteLoginStep
            postLoginToken={success.postLoginToken}
            phoneMasked={success.phoneMasked}
            otpSent={success.otpSent}
            embedded={embedded}
          />
        )}
      </div>
    );
  }

  if (loggedIn && hasCompleteName) {
    return (
      <div className="payment-complete-form">
        <div className="payment-complete-form__meta">
          <p className="payment-complete-form__meta-label">اطلاعات حساب شما</p>
          <div className="payment-complete-form__meta-rows">
            <div className="payment-complete-form__meta-row">
              <User2 className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
              <span>{profileName}</span>
            </div>
            {student?.mobile ? (
              <div className="payment-complete-form__meta-row text-bone-dim" dir="ltr">
                <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
                <span>{student.mobile}</span>
              </div>
            ) : null}
          </div>
        </div>

        {!embedded ? (
          <p className="text-caption text-mist">
            شماره سفارش: <span className="num-latin text-bone-dim">{orderNumber}</span>
          </p>
        ) : null}

        {submitting ? (
          <div className="payment-complete-form__loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال فعال‌سازی دسترسی…
          </div>
        ) : null}

        {serverError ? (
          <p role="alert" className="payment-complete-form__error">
            {serverError}
          </p>
        ) : null}
      </div>
    );
  }

  if (loggedIn && student) {
    return (
      <form className="payment-complete-form" onSubmit={onSubmit} noValidate>
        <div className="payment-complete-form__meta">
          <p className="payment-complete-form__meta-label">اطلاعات حساب شما</p>
          {student.mobile ? (
            <div className="payment-complete-form__meta-row text-bone-dim" dir="ltr">
              <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
              <span>{student.mobile}</span>
            </div>
          ) : null}
        </div>

        <NameEmailFieldsRow
          formId={formId}
          name={name}
          email={email}
          errors={errors}
          onNameChange={(value) => {
            setName(value);
            setErrors((er) => ({ ...er, name: "" }));
          }}
          onEmailChange={setEmail}
        />

        {serverError ? (
          <p role="alert" className="payment-complete-form__error">
            {serverError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="payment-result-card__primary payment-complete-form__submit neon-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill font-semibold disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ذخیره و ادامه
        </button>
      </form>
    );
  }

  return (
    <form className="payment-complete-form" onSubmit={onSubmit} noValidate>
      {phoneMasked ? (
        <div className="payment-complete-form__meta">
          <p className="payment-complete-form__meta-label">شماره ثبت‌شده در خرید</p>
          <div className="payment-complete-form__meta-row font-medium text-bone" dir="ltr">
            <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
            <span>{phoneMasked}</span>
          </div>
        </div>
      ) : null}

      {!embedded ? (
        <p className="text-caption text-mist">
          شماره سفارش: <span className="num-latin text-bone-dim">{orderNumber}</span>
        </p>
      ) : null}

      <NameEmailFieldsRow
        formId={formId}
        name={name}
        email={email}
        errors={errors}
        onNameChange={(value) => {
          setName(value);
          setErrors((er) => ({ ...er, name: "" }));
        }}
        onEmailChange={setEmail}
      />

      {serverError ? (
        <p role="alert" className="payment-complete-form__error">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="payment-result-card__primary payment-complete-form__submit neon-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill font-semibold disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        ذخیره و ادامه
      </button>
    </form>
  );
}
