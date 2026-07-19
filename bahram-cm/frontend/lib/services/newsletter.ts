/** Newsletter subscription service.
 *
 * Targets the Laravel backend's `/api/leads` endpoint (source `web_newsletter`),
 * so newsletter sign-ups show up alongside other leads in the admin dashboard.
 * If no backend is configured at build/runtime the call still returns a
 * structured failure the UI can show, so the form degrades gracefully instead
 * of faking success.
 */
import { postJson, type ApiResult } from "./api";
import type { CaptchaPayload } from "@/lib/captcha/types";
import { captchaToRequestFields } from "@/lib/captcha/types";

export type NewsletterResult = {
  id: number;
  status: string;
  created_at: string;
};

type LeadResponse = { data: NewsletterResult };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export async function subscribeNewsletter(
  email: string,
  source = "web_newsletter",
  captcha?: CaptchaPayload | null,
  website?: string,
): Promise<ApiResult<NewsletterResult>> {
  const result = await postJson<LeadResponse>("/leads", {
    email: email.trim(),
    source,
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
    ...captchaToRequestFields(captcha),
    website: website || undefined,
  });

  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
