"use client";

import { ArrowLeft, Loader2, Mail, Phone, User2 } from "lucide-react";
import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import {
  submitLead,
  validateLead,
  type FieldErrors,
  type LeadInput,
} from "@/lib/services/leads";

type Status = "idle" | "submitting" | "success" | "error";

const SOURCE = "web_apply";

const ROLE_OPTIONS = [
  "مشاور / مربی",
  "فروشنده‌ی دوره",
  "تولیدکننده‌ی محتوا",
  "صاحب کسب‌وکار",
  "طراح / متخصص خلاق",
  "سایر",
];

export function ApplyForm() {
  const formId = useId();
  const [values, setValues] = useState<LeadInput>({
    name: "",
    phone: "",
    email: "",
    role: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (key: keyof LeadInput) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setStatus((s) => (s === "error" ? "idle" : s));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateLead(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setServerError(null);
    track("academy_apply_submit", { source: SOURCE });

    const result = await submitLead({ ...values, source: SOURCE });
    if (result.ok) {
      setStatus("success");
      track("academy_apply_success", { source: SOURCE });
      setValues({ name: "", phone: "", email: "", role: "", notes: "" });
    } else {
      setStatus("error");
      setServerError(result.error);
      track("academy_apply_error", { source: SOURCE, code: result.code });
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-card border border-emerald/30 bg-emerald/8 p-8 text-center"
      >
        <p className="text-caption uppercase tracking-[0.25em] text-emerald-glow">
          درخواست ثبت شد
        </p>
        <h3 className="mt-4 text-h3 text-bone">ممنون که وقت گذاشتی.</h3>
        <p className="mt-3 text-bone-dim">
          درخواستت را دریافت کردیم. اگر مسیر مناسب باشد، تا چند روز کاری برای
          گفت‌وگوی ارزیابی با تو تماس می‌گیریم.
        </p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form className="mt-8 grid gap-5" onSubmit={onSubmit} noValidate>
      <TextField
        id={`${formId}-name`}
        label="نام و نام خانوادگی"
        name="name"
        value={values.name}
        onChange={set("name")}
        placeholder="مثال: بهرام رستمی"
        error={errors.name}
        icon={User2}
        autoComplete="name"
        required
      />
      <TextField
        id={`${formId}-phone`}
        label="شماره تماس"
        name="phone"
        type="tel"
        inputMode="tel"
        value={values.phone}
        onChange={set("phone")}
        placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
        error={errors.phone}
        icon={Phone}
        autoComplete="tel"
        dir="ltr"
        required
      />
      <TextField
        id={`${formId}-email`}
        label="ایمیل"
        name="email"
        type="email"
        inputMode="email"
        value={values.email}
        onChange={set("email")}
        placeholder="you@example.com"
        error={errors.email}
        icon={Mail}
        autoComplete="email"
        dir="ltr"
        required
      />

      <label className="block">
        <span className="block text-caption text-bone">حوزه‌ی فعالیت</span>
        <select
          name="role"
          value={values.role}
          onChange={(e) => set("role")(e.target.value)}
          className="mt-2 block h-12 w-full rounded-pill border border-bone/12 bg-ink/60 px-4 text-bone focus:border-emerald/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40"
        >
          <option value="">انتخاب کن…</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <TextArea
        id={`${formId}-notes`}
        label="چرا می‌خواهی وارد آکادمی شوی؟ و در ۹۰ روز آینده آماده‌ی چه اجرایی هستی؟"
        name="notes"
        value={values.notes ?? ""}
        onChange={set("notes")}
        placeholder="چند جمله درباره‌ی هدف و آمادگی‌ات…"
        error={errors.notes}
      />

      {status === "error" && serverError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-tile border border-gold/30 bg-gold/8 px-4 py-3 text-sm text-gold"
        >
          {serverError}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="group neon-btn-primary inline-flex h-12 min-h-12 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-pill bg-emerald px-7 font-semibold text-ink transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              در حال ارسال…
            </>
          ) : (
            <>
              ارسال درخواست
              <ArrowLeft
                className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </button>
        <p className="text-caption text-mist">
          با ارسال این فرم، با شرایط ارزیابی موافقت می‌کنی.
        </p>
      </div>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  autoComplete?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
};

function TextField({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  error,
  icon: Icon,
  autoComplete,
  dir,
  required,
}: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <label htmlFor={id} className="block">
      <span className="block text-caption text-bone">
        {label}
        {required ? <span className="text-gold"> *</span> : null}
      </span>
      <span className="relative mt-2 block">
        {Icon ? (
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "block h-12 w-full rounded-pill border bg-ink/60 px-4 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
            Icon ? "ps-10" : "",
            error ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
          )}
        />
      </span>
      {error ? (
        <span id={errorId} role="alert" className="mt-1.5 block text-caption text-gold">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TextArea({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <label htmlFor={id} className="block">
      <span className="block text-caption text-bone">{label}</span>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "mt-2 block w-full rounded-card border bg-ink/60 p-4 text-bone placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40",
          error ? "border-gold/60" : "border-bone/12 focus:border-emerald/40",
        )}
      />
      {error ? (
        <span id={errorId} role="alert" className="mt-1.5 block text-caption text-gold">
          {error}
        </span>
      ) : null}
    </label>
  );
}
