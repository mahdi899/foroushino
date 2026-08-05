"use client";

import { ArrowLeft, Loader2, Mail, MessageSquare, Phone, User2 } from "lucide-react";
import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import {
  normalizeLandingPhoneInput,
  submitLandingLead,
  validateLandingLead,
  type LandingLeadFieldErrors,
} from "@/lib/services/leads";
import type { PublicLandingPage } from "@/lib/services/landingPages";

type Status = "idle" | "loading" | "ok" | "err";

const inputClass =
  "mt-2.5 block w-full rounded-2xl border border-bone/20 bg-ink/45 px-4 py-4 text-center text-lg leading-normal text-bone placeholder:text-center placeholder:text-mist/80 focus:border-emerald/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/30 md:rounded-tile md:py-3.5 md:ps-12 md:text-start md:text-base md:placeholder:text-start";

const iconClass =
  "pointer-events-none absolute inset-y-0 start-3.5 hidden items-center text-mist md:flex";

const labelClass =
  "block text-center text-lg font-medium text-bone md:text-start md:text-sm";

const actionSlotClass =
  "flex h-14 min-h-14 w-full items-center justify-center rounded-pill md:h-12 md:min-h-12";

export function LandingLeadForm({
  slug,
  formFields,
  submitLabel,
  className,
}: {
  slug: string;
  formFields: PublicLandingPage["form_fields"];
  submitLabel?: string | null;
  successMessage?: string | null;
  className?: string;
}) {
  const formId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LandingLeadFieldErrors>({});

  const resetErrors = () => {
    if (status === "ok" || status === "loading") return;
    if (Object.keys(fieldErrors).length) setFieldErrors({});
    if (status !== "idle") {
      setStatus("idle");
      setFeedback("");
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "ok" || status === "loading") return;

    const errors = validateLandingLead({ name, phone });
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setStatus("err");
      setFeedback(errors.phone || errors.name || "لطفاً فیلدهای مشخص‌شده را اصلاح کن.");
      return;
    }

    flushSync(() => {
      setStatus("loading");
      setFeedback("");
      setFieldErrors({});
    });

    const result = await submitLandingLead({
      name,
      phone,
      message: formFields.message ? message : undefined,
      email: formFields.email ? email : undefined,
      landing_slug: slug,
    });

    if (result.ok) {
      flushSync(() => {
        setStatus("ok");
        setFeedback("شماره شما ثبت شد");
      });
      return;
    }

    setStatus("err");
    setFeedback(result.error);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn("landing-lead-form relative w-full", className)}
      noValidate
      autoComplete="off"
    >
      <div className="space-y-7 md:space-y-4">
        <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
          <label htmlFor={`${formId}-name`} className="block min-w-0">
            <span className={labelClass}>نام و نام خانوادگی</span>
            <div className="relative">
              <span className={iconClass}>
                <User2 className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-name`}
                name="landing-full-name"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading" || status === "ok"}
                placeholder="مثلاً علی محمدی"
                className={cn(inputClass, fieldErrors.name && "border-gold/60")}
              />
            </div>
          </label>

          <label htmlFor={`${formId}-phone`} className="block min-w-0">
            <span className={labelClass}>شماره تماس</span>
            <div className="relative">
              <span className={iconClass}>
                <Phone className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-phone`}
                name="landing-mobile"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                maxLength={11}
                value={phone}
                onChange={(e) => {
                  setPhone(normalizeLandingPhoneInput(e.target.value));
                  resetErrors();
                }}
                disabled={status === "loading" || status === "ok"}
                placeholder="0912xxxxxxx"
                className={cn(inputClass, "num-latin", fieldErrors.phone && "border-gold/60")}
              />
            </div>
          </label>
        </div>

        {formFields.email ? (
          <label htmlFor={`${formId}-email`} className="block">
            <span className={labelClass}>ایمیل</span>
            <div className="relative">
              <span className={iconClass}>
                <Mail className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-email`}
                name="landing-email"
                type="email"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading" || status === "ok"}
                className={inputClass}
              />
            </div>
          </label>
        ) : null}

        {formFields.message ? (
          <label htmlFor={`${formId}-message`} className="block">
            <span className={labelClass}>توضیحات</span>
            <div className="relative">
              <span className="pointer-events-none absolute start-3.5 top-4 hidden text-mist md:block">
                <MessageSquare className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <textarea
                id={`${formId}-message`}
                name="landing-notes"
                rows={2}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading" || status === "ok"}
                placeholder="اگر نکته‌ای هست بنویس…"
                className={cn(inputClass, "min-h-[5rem] resize-y")}
              />
            </div>
          </label>
        ) : null}

        {/* Fixed-height action slot — loading / success swap without layout jump */}
        <div className="space-y-3">
          {status === "ok" ? (
            <p
              role="status"
              aria-live="polite"
              className={cn(
                actionSlotClass,
                "border border-emerald/35 bg-emerald/15 px-5 text-center text-lg font-semibold text-emerald-glow md:text-base",
              )}
            >
              {feedback}
            </p>
          ) : (
            <button
              type="submit"
              disabled={status === "loading"}
              aria-busy={status === "loading"}
              className={cn(
                actionSlotClass,
                "group neon-btn-primary gap-2 bg-emerald px-6 text-lg font-semibold transition-[background-color,box-shadow] duration-300 ease-[var(--ease-luxe)] md:text-base",
                status === "loading"
                  ? "cursor-wait opacity-100"
                  : "hover:bg-emerald-glow disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                  <span>در حال ثبت…</span>
                </>
              ) : (
                <>
                  <span>{submitLabel?.trim() || "ارسال"}</span>
                  <ArrowLeft className="rtl-flip h-5 w-5 shrink-0" aria-hidden />
                </>
              )}
            </button>
          )}

          <p
            role="status"
            aria-live="polite"
            className={cn(
              "min-h-[1.5rem] text-center text-base leading-snug",
              status === "err" ? "text-gold" : "invisible",
            )}
          >
            {feedback || "\u00a0"}
          </p>
        </div>
      </div>
    </form>
  );
}
