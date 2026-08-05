"use client";

import { ArrowLeft, Loader2, Mail, MessageSquare, Phone, User2 } from "lucide-react";
import { useId, useState } from "react";
import { useFormSecurity } from "@/components/captcha/FormCaptcha";
import { cn } from "@/lib/cn";
import {
  submitLandingLead,
  validateLandingLead,
  type LandingLeadFieldErrors,
} from "@/lib/services/leads";
import { captchaToRequestFields } from "@/lib/captcha/types";
import type { PublicLandingPage } from "@/lib/services/landingPages";

type Status = "idle" | "loading" | "ok" | "err";

const inputClass =
  "mt-2 block w-full rounded-tile border border-bone/12 bg-ink/60 px-4 py-3 text-sm text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/30";

export function LandingLeadForm({
  slug,
  formFields,
  submitLabel,
  successMessage,
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

  const { captchaField, honeypotField, captchaRequired, captchaReady, securityLoading, getSecurityPayload, resetCaptcha } =
    useFormSecurity("leads", { captchaInline: false });

  const resetErrors = () => {
    if (Object.keys(fieldErrors).length) setFieldErrors({});
    if (status !== "idle") setStatus("idle");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validateLandingLead({ name, phone });
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setStatus("err");
      setFeedback("لطفاً فیلدهای مشخص‌شده را اصلاح کن.");
      return;
    }

    const { captcha, website } = getSecurityPayload();
    if (captchaRequired && !captcha) {
      setStatus("err");
      setFeedback("لطفاً تأیید امنیتی را تکمیل کن.");
      return;
    }

    setStatus("loading");
    setFeedback("");

    const result = await submitLandingLead({
      name,
      phone,
      message: formFields.message ? message : undefined,
      email: formFields.email ? email : undefined,
      landing_slug: slug,
      ...captchaToRequestFields(captcha),
      website,
    });

    if (result.ok) {
      setStatus("ok");
      setFeedback(successMessage?.trim() || "ثبت شد. به‌زودی با تو تماس می‌گیریم.");
      setName("");
      setPhone("");
      setMessage("");
      setEmail("");
      setFieldErrors({});
      return;
    }

    setStatus("err");
    setFeedback(result.error);
    if (captchaRequired && /تأیید امنیتی|کپچا/i.test(result.error)) {
      resetCaptcha();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "landing-lead-form neon-surface-static relative rounded-card-lg border border-bone/10 bg-charcoal/55 p-5 md:p-7",
        className,
      )}
      noValidate
    >
      {honeypotField}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${formId}-name`} className="block min-w-0">
            <span className="block text-caption text-bone">نام *</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
                <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-name`}
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading"}
                className={cn(inputClass, "ps-10", fieldErrors.name && "border-gold/60")}
              />
            </div>
            {fieldErrors.name ? (
              <span role="alert" className="mt-1.5 block text-caption text-gold">
                {fieldErrors.name}
              </span>
            ) : null}
          </label>

          <label htmlFor={`${formId}-phone`} className="block min-w-0">
            <span className="block text-caption text-bone">شماره *</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
                <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-phone`}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading"}
                placeholder="۰۹۱۲..."
                className={cn(inputClass, "ps-10 num-latin", fieldErrors.phone && "border-gold/60")}
              />
            </div>
            {fieldErrors.phone ? (
              <span role="alert" className="mt-1.5 block text-caption text-gold">
                {fieldErrors.phone}
              </span>
            ) : null}
          </label>
        </div>

        {formFields.email ? (
          <label htmlFor={`${formId}-email`} className="block">
            <span className="block text-caption text-bone">ایمیل</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
                <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-email`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading"}
                className={cn(inputClass, "ps-10")}
              />
            </div>
          </label>
        ) : null}

        {formFields.message ? (
          <label htmlFor={`${formId}-message`} className="block">
            <span className="block text-caption text-bone">توضیحات</span>
            <div className="relative">
              <span className="pointer-events-none absolute start-3 top-3.5 text-mist">
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <textarea
                id={`${formId}-message`}
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  resetErrors();
                }}
                disabled={status === "loading"}
                placeholder="اگر نکته‌ای هست بنویس…"
                className={cn(inputClass, "min-h-[7rem] resize-y ps-10")}
              />
            </div>
          </label>
        ) : null}

        {captchaRequired ? (
          <div className="block min-w-0">
            <span className="block text-caption text-bone">تأیید امنیتی *</span>
            <div className="mt-2 min-w-0 rounded-tile border border-bone/12 bg-ink/60 px-3 py-3">
              {captchaField}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "loading" || securityLoading || !captchaReady}
          aria-busy={status === "loading"}
          className="group neon-btn-primary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-6 text-sm font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <span>{submitLabel?.trim() || "ارسال"}</span>
              <ArrowLeft
                className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </button>

        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-center text-caption transition-opacity",
            status === "idle" && "hidden",
            status === "ok" && "text-emerald-glow",
            status === "err" && "text-gold",
          )}
        >
          {feedback}
        </p>
      </div>
    </form>
  );
}
