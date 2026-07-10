/** Academy application (lead) submission service. */
import { postJson, type ApiResult } from "./api";

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  role?: string;
  notes?: string;
  source?: string;
  captcha_token?: string;
  captcha_id?: string;
  captcha_answer?: string;
  website?: string;
};

export type LeadResult = {
  id: number;
  status: string;
  created_at: string;
};

type LeadResponse = { data: LeadResult };

export type FieldErrors = Partial<Record<keyof LeadInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts Iranian + international formats: digits, spaces, +, -, ().
const PHONE_RE = /^[+]?[\d\s()-]{6,20}$/;

/** Client-side validation mirroring the backend schema. */
export function validateLead(input: LeadInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name || input.name.trim().length < 2) {
    errors.name = "نام را کامل وارد کن.";
  }
  if (!input.phone || !PHONE_RE.test(input.phone.trim())) {
    errors.phone = "شماره تماس معتبر وارد کن.";
  }
  if (!input.email || !EMAIL_RE.test(input.email.trim())) {
    errors.email = "ایمیل را درست وارد کن.";
  }
  if (input.notes && input.notes.length > 4000) {
    errors.notes = "توضیحات بیش از حد طولانی است.";
  }
  return errors;
}

/** Folds the role select + free-text notes into the backend's single `message` field. */
function buildMessage(input: LeadInput): string | null {
  const parts: string[] = [];
  if (input.role?.trim()) parts.push(`حوزه‌ی فعالیت: ${input.role.trim()}`);
  if (input.notes?.trim()) parts.push(input.notes.trim());
  return parts.length ? parts.join("\n\n") : null;
}

export async function submitLead(input: LeadInput): Promise<ApiResult<LeadResult>> {
  const result = await postJson<LeadResponse>("/leads", {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    message: buildMessage(input),
    source: input.source ?? "web_apply",
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
    captcha_token: input.captcha_token,
    captcha_id: input.captcha_id,
    captcha_answer: input.captcha_answer,
    website: input.website || undefined,
  });

  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}

export type ContactInput = {
  name: string;
  phone: string;
  message: string;
  source?: string;
};

export type ContactFieldErrors = Partial<Record<keyof ContactInput, string>>;

export function validateContact(input: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  if (!input.name || input.name.trim().length < 2) {
    errors.name = "نام را کامل وارد کن.";
  }
  if (!input.phone || !PHONE_RE.test(input.phone.trim())) {
    errors.phone = "شماره تماس معتبر وارد کن.";
  }
  if (!input.message || input.message.trim().length < 10) {
    errors.message = "پیام را کمی بیشتر توضیح بده (حداقل ۱۰ کاراکتر).";
  }
  if (input.message && input.message.length > 2000) {
    errors.message = "پیام بیش از حد طولانی است.";
  }
  return errors;
}

export async function submitContact(input: ContactInput): Promise<ApiResult<LeadResult>> {
  const result = await postJson<LeadResponse>("/leads", {
    name: input.name.trim(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    source: input.source ?? "web_contact",
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
  });

  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
