"use client";

import { Loader2, Mail, Phone, ShieldCheck, User2 } from "lucide-react";
import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { createOrder } from "@/lib/services/orders";
import { requestZarinpalPayment } from "@/lib/services/payments";
import type { ProductDetail } from "@/lib/services/products";

type Status = "idle" | "submitting" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{6,20}$/;

export function PurchaseForm({ product }: { product: ProductDetail }) {
  const formId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const found: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) found.name = "نام را کامل وارد کن.";
    if (!phone.trim() || !PHONE_RE.test(phone.trim())) found.phone = "شماره تماس معتبر وارد کن.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) found.email = "ایمیل را درست وارد کن.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("submitting");
    setServerError(null);
    track("checkout_start", { product: product.slug });

    const orderResult = await createOrder({
      product_id: product.id,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_email: email.trim() || undefined,
    });

    if (!orderResult.ok) {
      setStatus("error");
      setServerError(orderResult.error);
      track("checkout_error", { product: product.slug, code: orderResult.code });
      return;
    }

    const paymentResult = await requestZarinpalPayment(orderResult.data.id);

    if (!paymentResult.ok) {
      setStatus("error");
      setServerError(paymentResult.error);
      track("checkout_error", { product: product.slug, code: paymentResult.code });
      return;
    }

    track("checkout_success", {
      product: product.slug,
      order: orderResult.data.order_number,
    });
    window.location.href = paymentResult.data.payment_url;
  }

  const submitting = status === "submitting";

  return (
    <form className="grid gap-5" onSubmit={onSubmit} noValidate>
      <label htmlFor={`${formId}-name`} className="block">
        <span className="block text-caption text-bone">نام و نام خانوادگی</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-name`}
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((er) => ({ ...er, name: undefined }));
            }}
            placeholder="مثال: بهرام رستمی"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            className={cn(
              "block h-12 w-full rounded-pill border bg-ink/60 px-4 ps-10 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
              errors.name ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
            )}
          />
        </span>
        {errors.name ? (
          <span role="alert" className="mt-1.5 block text-caption text-gold">
            {errors.name}
          </span>
        ) : null}
      </label>

      <label htmlFor={`${formId}-phone`} className="block">
        <span className="block text-caption text-bone">شماره تماس</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((er) => ({ ...er, phone: undefined }));
            }}
            placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            className={cn(
              "block h-12 w-full rounded-pill border bg-ink/60 px-4 ps-10 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
              errors.phone ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
            )}
          />
        </span>
        {errors.phone ? (
          <span role="alert" className="mt-1.5 block text-caption text-gold">
            {errors.phone}
          </span>
        ) : null}
      </label>

      <label htmlFor={`${formId}-email`} className="block">
        <span className="block text-caption text-bone">ایمیل (اختیاری)</span>
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            inputMode="email"
            dir="ltr"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((er) => ({ ...er, email: undefined }));
            }}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            className={cn(
              "block h-12 w-full rounded-pill border bg-ink/60 px-4 ps-10 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
              errors.email ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
            )}
          />
        </span>
        {errors.email ? (
          <span role="alert" className="mt-1.5 block text-caption text-gold">
            {errors.email}
          </span>
        ) : null}
      </label>

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
