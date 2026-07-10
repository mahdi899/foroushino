"use client";

import { ArrowLeft, Loader2, MessageSquare, Phone, User2 } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { submitContact, validateContact, type ContactFieldErrors } from "@/lib/services/leads";

type Status = "idle" | "loading" | "ok" | "err";

const inputClass =
  "mt-2 block w-full rounded-tile border border-bone/12 bg-ink/60 px-4 py-3 text-sm text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/30";

export function ContactForm({ className }: { className?: string }) {
  const formId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});

  const resetErrors = () => {
    if (Object.keys(fieldErrors).length) setFieldErrors({});
    if (status !== "idle") setStatus("idle");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = { name, phone, message };
    const errors = validateContact(payload);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setStatus("err");
      setFeedback("لطفاً فیلدهای مشخص‌شده را اصلاح کن.");
      return;
    }

    setStatus("loading");
    setFeedback("");

    const result = await submitContact({
      ...payload,
      source: "web_contact",
    });

    if (result.ok) {
      setStatus("ok");
      setFeedback("پیامت ثبت شد. به‌زودی با تو تماس می‌گیریم.");
      setName("");
      setPhone("");
      setMessage("");
      setFieldErrors({});
      return;
    }

    setStatus("err");
    setFeedback(result.error);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "contact-form neon-surface-static relative rounded-card-lg border border-bone/10 bg-charcoal/55 p-5 md:p-7",
        className,
      )}
      noValidate
    >
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

        <label htmlFor={`${formId}-message`} className="block">
          <span className="block text-caption text-bone">پیام *</span>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-3.5 text-mist">
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
            <textarea
              id={`${formId}-message`}
              rows={5}
              required
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                resetErrors();
              }}
              disabled={status === "loading"}
              placeholder="سؤال یا درخواستت را بنویس..."
              className={cn(inputClass, "min-h-[9rem] resize-y ps-10", fieldErrors.message && "border-gold/60")}
            />
          </div>
          {fieldErrors.message ? (
            <span role="alert" className="mt-1.5 block text-caption text-gold">
              {fieldErrors.message}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          className="group neon-btn-primary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-emerald px-6 text-sm font-semibold transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <span>ارسال پیام</span>
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
