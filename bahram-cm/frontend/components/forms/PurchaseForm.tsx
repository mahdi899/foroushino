"use client";

import { Loader2, Phone, ShieldCheck, User2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { useCheckoutAutopay, useCheckoutLoginGate } from "@/lib/checkout/checkoutLogin";
import {
  resendGuestCheckoutOtpAction,
  sendGuestCheckoutOtpAction,
  startLoggedInCheckoutAction,
  verifyGuestCheckoutAndPayAction,
} from "@/lib/checkout/actions";
import {
  buildCustomerName,
  prefillExtraFields,
  productCheckoutFields,
  productNeedsExtraForm,
  type CheckoutField,
} from "@/lib/checkout/productFields";
import { cn } from "@/lib/cn";
import { getIranMobileInputError, isValidIranMobile, normalizeIranMobile, sanitizePhoneInput } from "@/lib/chatbot/phone";
import { captureReferralCode } from "@/lib/referral/capture";
import { captureDiscountCode } from "@/lib/discount/capture";
import type { ProductDetail } from "@/lib/services/products";
import type { StudentUser } from "@/lib/student/session";
import { GuestCheckoutOtpModal } from "@/components/forms/GuestCheckoutOtpModal";

type Status = "idle" | "submitting" | "error";
type GuestStep = "details" | "otp";

const OTP_RESEND_SECONDS = 60;
function ExtraFieldInput({
  field,
  value,
  onChange,
  error,
  formId,
  className,
}: {
  field: CheckoutField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  formId: string;
  className?: string;
}) {
  const id = `${formId}-${field.key}`;

  if (field.type === "textarea") {
    return (
      <label htmlFor={id} className={cn("block", className)}>
        <span className="block text-caption text-bone">
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cn(
            "mt-2 block w-full rounded-tile border bg-ink/60 px-4 py-3 text-sm text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
            error ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
          )}
        />
        {error ? (
          <span role="alert" className="mt-1.5 block text-caption text-gold">
            {error}
          </span>
        ) : null}
      </label>
    );
  }

  return (
    <label htmlFor={id} className={cn("block", className)}>
      <span className="block text-caption text-bone">
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <input
        id={id}
        type={field.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn(
          "mt-2 block h-12 w-full rounded-pill border bg-ink/60 px-4 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
          error ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
        )}
      />
      {error ? (
        <span role="alert" className="mt-1.5 block text-caption text-gold">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function PurchaseFormInner({
  product,
  student,
}: {
  product: ProductDetail;
  student: StudentUser | null;
}) {
  const formId = useId();
  const extraFields = useMemo(() => productCheckoutFields(product), [product]);
  const needsExtra = productNeedsExtraForm(product);
  const isLoggedIn = Boolean(student);
  const isFreeProduct = product.effective_price <= 0;
  const buyerName = student ? buildCustomerName(student.profile, student.name) : "";

  const [extra, setExtra] = useState<Record<string, string>>(() =>
    prefillExtraFields(extraFields, student?.profile),
  );
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestStep, setGuestStep] = useState<GuestStep>("details");
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [guestErrors, setGuestErrors] = useState<{ name?: string; phone?: string }>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const { requireLoginOr } = useCheckoutLoginGate({ isLoggedIn });

  const goToGateway = useCallback(async () => {
    if (!student) return;

    setStatus("submitting");
    setServerError(null);
    track("checkout_start", { product: product.slug });

    const ref = captureReferralCode();
    const discount = captureDiscountCode();
    const extraPayload = Object.keys(extra).length ? extra : undefined;

    const result = await startLoggedInCheckoutAction({
      product_id: product.id,
      ref,
      coupon: discount.code,
      coupon_via_link: discount.viaLink,
      customer_extra_data: extraPayload,
    });

    if (!result.ok) {
      setStatus("error");
      setServerError(result.error);
      track("checkout_error", { product: product.slug });
      return;
    }

    track("checkout_success", { product: product.slug, order: result.order_number });
    window.location.href = result.payment_url;
  }, [extra, product, student]);

  useCheckoutAutopay(isLoggedIn, goToGateway);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  function validateExtraFields(): boolean {    const found: Record<string, string> = {};

    for (const field of extraFields) {
      if (field.required && !extra[field.key]?.trim()) {
        found[field.key] = `${field.label} را وارد کن.`;
      }
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function validateGuestFields(): boolean {
    const found: { name?: string; phone?: string } = {};
    if (!guestName.trim()) found.name = "نام را وارد کن.";
    if (!isValidIranMobile(guestPhone)) {
      found.phone = getIranMobileInputError(guestPhone) ?? "شماره موبایل معتبر نیست.";
    }
    setGuestErrors(found);
    return Object.keys(found).length === 0;
  }

  const sendGuestOtp = useCallback(async () => {
    setStatus("submitting");
    setServerError(null);
    setOtpInfo(null);

    const ref = captureReferralCode();
    const discount = captureDiscountCode();
    const extraPayload = Object.keys(extra).length ? extra : undefined;

    const result = await sendGuestCheckoutOtpAction({
      product_id: product.id,
      customer_name: guestName.trim(),
      customer_phone: normalizeIranMobile(guestPhone),
      ref,
      coupon: discount.code,
      coupon_via_link: discount.viaLink,
      customer_extra_data: extraPayload,
    });

    if (!result.ok) {
      setStatus("error");
      setServerError(result.error);
      track("checkout_error", { product: product.slug });
      return;
    }

    setCheckoutToken(result.checkout_token);
    setPhoneMasked(result.customer_phone_masked);
    setGuestStep("otp");
    setOtpCode("");
    setOtpInfo(
      result.customer_phone_masked
        ? `کد تأیید به ${result.customer_phone_masked} پیامک شد.`
        : "کد تأیید برای شما پیامک شد.",
    );
    setResendIn(OTP_RESEND_SECONDS);
    setStatus("idle");
  }, [extra, guestName, guestPhone, product]);

  const verifyGuestAndPay = useCallback(
    async (code: string) => {
      if (!checkoutToken || status === "submitting") return;

      setStatus("submitting");
      setServerError(null);
      track("checkout_start", { product: product.slug });

      const result = await verifyGuestCheckoutAndPayAction({
        checkout_token: checkoutToken,
        code,
      });

      if (!result.ok) {
        setStatus("error");
        setServerError(result.error);
        setOtpCode("");
        track("checkout_error", { product: product.slug });
        return;
      }

      track("checkout_success", { product: product.slug, order: result.order_number });
      window.location.href = result.payment_url;
    },
    [checkoutToken, product, status],
  );

  async function handleResendOtp() {
    if (!checkoutToken || resendIn > 0 || status === "submitting") return;

    setStatus("submitting");
    setServerError(null);

    const result = await resendGuestCheckoutOtpAction(checkoutToken);
    setStatus("idle");

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    setOtpInfo("کد جدید ارسال شد.");
    setResendIn(OTP_RESEND_SECONDS);
    setOtpCode("");
  }

  function resetGuestOtp() {
    setGuestStep("details");
    setCheckoutToken(null);
    setOtpCode("");
    setOtpInfo(null);
    setServerError(null);
    setStatus("idle");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateExtraFields()) return;

    if (isLoggedIn) {
      requireLoginOr(goToGateway);
      return;
    }

    if (guestStep === "otp") return;

    if (!validateGuestFields()) return;
    await sendGuestOtp();
  }

  const submitting = status === "submitting";
  const otpModalOpen = guestStep === "otp";
  return (
    <>
      <GuestCheckoutOtpModal
        open={otpModalOpen}
        phoneMasked={phoneMasked}
        otpInfo={otpInfo}
        otpCode={otpCode}
        onOtpChange={setOtpCode}
        onComplete={verifyGuestAndPay}
        onResend={() => void handleResendOtp()}
        onEditPhone={resetGuestOtp}
        resendIn={resendIn}
        submitting={submitting}
        error={otpModalOpen ? serverError : null}
        isFreeProduct={isFreeProduct}
      />

      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      {isLoggedIn && student ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-tile border border-bone/10 bg-ink/40 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-bone">
            <User2 className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
            <span>{buyerName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-bone-dim" dir="ltr">
            <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
            <span>{student.mobile}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor={`${formId}-guest-name`} className="block">
            <span className="block text-caption text-bone">نام و نام خانوادگی *</span>
            <input
              id={`${formId}-guest-name`}
              type="text"
              value={guestName}
              onChange={(e) => {                setGuestName(e.target.value);
                setGuestErrors((prev) => ({ ...prev, name: undefined }));
              }}
              autoComplete="name"
              className={cn(
                "mt-2 block h-12 w-full rounded-pill border bg-ink/60 px-4 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
                guestErrors.name ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
              )}
            />
            {guestErrors.name ? (
              <span role="alert" className="mt-1.5 block text-caption text-gold">
                {guestErrors.name}
              </span>
            ) : null}
          </label>

          <label htmlFor={`${formId}-guest-phone`} className="block">
            <span className="block text-caption text-bone">شماره موبایل *</span>
            <input
              id={`${formId}-guest-phone`}
              type="tel"
              inputMode="numeric"
              value={guestPhone}
              onChange={(e) => {                setGuestPhone(sanitizePhoneInput(e.target.value));
                setGuestErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              autoComplete="tel"
              placeholder="09xxxxxxxxx"
              dir="ltr"
              maxLength={11}
              className={cn(
                "mt-2 block h-12 w-full rounded-pill border bg-ink/60 px-4 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
                guestErrors.phone ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
              )}
            />
            {guestErrors.phone ? (
              <span role="alert" className="mt-1.5 block text-caption text-gold">
                {guestErrors.phone}
              </span>
            ) : null}
          </label>
        </div>
      )}

      {needsExtra ? (
        <div className="grid grid-cols-1 gap-3 border-t border-bone/10 pt-4 sm:grid-cols-2">
          {extraFields.map((field) => (
            <ExtraFieldInput
              key={field.key}
              field={field}
              formId={formId}
              className={field.type === "textarea" ? "sm:col-span-2" : undefined}
              value={extra[field.key] ?? ""}
              error={errors[field.key]}
              onChange={(value) => {
                setExtra((prev) => ({ ...prev, [field.key]: value }));
                setErrors((er) => ({ ...er, [field.key]: "" }));
              }}
            />
          ))}
        </div>
      ) : null}

      {!otpModalOpen && status === "error" && serverError ? (        <p
          role="alert"
          aria-live="assertive"
          className="rounded-tile border border-gold/30 bg-gold/8 px-4 py-3 text-sm text-gold"
        >
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || otpModalOpen}
        className="group neon-btn-primary mt-1 inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-7 font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && !otpModalOpen ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال ارسال کد…
          </>
        ) : isFreeProduct ? (
          'ثبت‌نام رایگان'
        ) : (
          'پرداخت امن و ادامه'
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-caption text-mist">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-glow" strokeWidth={1.5} aria-hidden />
        {isFreeProduct ? 'ثبت‌نام رایگان — بدون پرداخت آنلاین' : 'پرداخت امن از طریق درگاه زرین‌پال'}
      </p>
    </form>
    </>
  );
}

export function PurchaseForm(props: { product: ProductDetail; student: StudentUser | null }) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-card bg-charcoal/30" />}>
      <PurchaseFormInner {...props} />
    </Suspense>
  );
}
