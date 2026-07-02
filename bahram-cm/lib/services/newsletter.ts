/** Newsletter subscription service.
 *
 * Targets the backend `/leads/newsletter` endpoint. If no backend is configured
 * at build/runtime the call still returns a structured failure the UI can show,
 * so the form degrades gracefully instead of faking success.
 */
import { postJson, type ApiResult } from "./api";

export type NewsletterResult = {
  id: number;
  email: string;
  status: string;
  created_at: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export async function subscribeNewsletter(
  email: string,
  source = "web_newsletter",
): Promise<ApiResult<NewsletterResult>> {
  return postJson<NewsletterResult>("/leads/newsletter", {
    email: email.trim(),
    source,
  });
}
