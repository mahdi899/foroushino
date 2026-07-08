"use client";

import { Loader2, Phone, ShieldCheck, User2 } from "lucide-react";
import { Suspense, useCallback, useId, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { useCheckoutAutopay, useCheckoutLoginGate } from "@/lib/checkout/checkoutLogin";
import { startLoggedInCheckoutAction } from "@/lib/checkout/actions";
import {
  buildCustomerName,
  prefillExtraFields,
  productCheckoutFields,
  productNeedsExtraForm,
  type CheckoutField,
} from "@/lib/checkout/productFields";
import { cn } from "@/lib/cn";
import { captureReferralCode } from "@/lib/referral/capture";
import type { ProductDetail } from "@/lib/services/products";
import type { StudentUser } from "@/lib/student/session";

type Status = "idle" | "submitting" | "error";

function ExtraFieldInput({
  field,
  value,
  onChange,
  error,
  formId,
}: {
  field: CheckoutField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  formId: string;
}) {
  const id = `${formId}-${field.key}`;

  if (field.type === "textarea") {
    return (
      <label htmlFor={id} className="block">
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
    <label htmlFor={id} className="block">
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
  const buyerName = student ? buildCustomerName(student.profile, student.name) : "";

  const [extra, setExtra] = useState<Record<string, string>>(() =>
    prefillExtraFields(extraFields, student?.profile),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const { requireLoginOr } = useCheckoutLoginGate({ isLoggedIn });

  const goToGateway = useCallback(async () => {
    if (!student) return;

    setStatus("submitting");
    setServerError(null);
    track("checkout_start", { product: product.slug });

    const ref = captureReferralCode();
    const extraPayload = Object.keys(extra).length ? extra : undefined;

    const result = await startLoggedInCheckoutAction({
      product_id: product.id,
      ref,
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

  function validateExtraFields(): boolean {
    const found: Record<string, string> = {};

    for (const field of extraFields) {
      if (field.required && !extra[field.key]?.trim()) {
        found[field.key] = `${field.label} را وارد کن.`;
      }
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateExtraFields()) return;

    requireLoginOr(goToGateway);
  }

  const submitting = status === "submitting";

  return (
    <form className="grid gap-5" onSubmit={onSubmit} noValidate>
      {isLoggedIn && student ? (
        <div className="rounded-tile border border-bone/10 bg-ink/40 p-4">
          <p className="text-caption text-mist">خریدار</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-bone">
              <User2 className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
              <span>{buyerName}</span>
            </div>
            <div className="flex items-center gap-2 text-bone-dim" dir="ltr">
              <Phone className="h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.5} aria-hidden />
              <span>{student.mobile}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-tile border border-bone/10 bg-ink/40 px-4 py-3 text-sm text-bone-dim">
          برای ادامه پرداخت، با شماره موبایل خود وارد می‌شوی. کد تأیید در پاپ‌آپ نمایش داده می‌شود.
        </p>
      )}

      {needsExtra ? (
        <div className="grid gap-4 border-t border-bone/10 pt-4">
          <h3 className="text-sm font-semibold text-bone">اطلاعات تکمیلی محصول</h3>
          {extraFields.map((field) => (
            <ExtraFieldInput
              key={field.key}
              field={field}
              formId={formId}
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

      {status === "error" && serverError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-tile border border-gold/30 bg-gold/8 px-4 py-3 text-sm text-gold"
        >
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="group neon-btn-primary mt-1 inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-7 font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            در حال انتقال به درگاه پرداخت…
          </>
        ) : (
          "پرداخت امن و ادامه"
        )}
      </button>

      <p className="flex items-center justify-center gap-2 text-caption text-mist">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-glow" strokeWidth={1.5} aria-hidden />
        پرداخت امن از طریق درگاه زرین‌پال
      </p>
    </form>
  );
}

export function PurchaseForm(props: { product: ProductDetail; student: StudentUser | null }) {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-card bg-charcoal/30" />}>
      <PurchaseFormInner {...props} />
    </Suspense>
  );
}
