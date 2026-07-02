/** Academy application (lead) submission service. */
import { postJson, type ApiResult } from "./api";

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  role?: string;
  notes?: string;
  source?: string;
};

export type LeadResult = {
  id: number;
  status: string;
  created_at: string;
};

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

export async function submitLead(input: LeadInput): Promise<ApiResult<LeadResult>> {
  return postJson<LeadResult>("/leads/apply", {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    role: input.role?.trim() || null,
    notes: input.notes?.trim() || null,
    source: input.source ?? "web_apply",
  });
}
