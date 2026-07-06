import { apiFetch } from './client';
import type { CaptchaPayload } from '@/lib/captcha/types';

export interface LeadPayload extends CaptchaPayload {
  name: string;
  phone: string;
  service_interest?: string;
  best_call_time?: string;
  budget_pref?: string;
  preferred_contact?: 'call' | 'whatsapp';
  form_type?: string;
  campaign_slug?: string;
  page_url?: string;
  consent: boolean;
  answers?: Record<string, string>;
  utm?: Record<string, string>;
}

export interface PricingLeadPayload extends CaptchaPayload {
  name: string;
  phone: string;
  preferred_contact?: 'call' | 'whatsapp';
  line: string;
  brand?: string;
  model?: string;
  units?: number;
  payment_type: 'cash' | 'installment';
  months?: number;
  budget_pref?: string;
  best_call_time?: string;
  page_url?: string;
  consent: boolean;
  utm?: Record<string, string>;
}

export async function submitLead(payload: LeadPayload): Promise<{ id: number }> {
  const res = await apiFetch<{ data: { id: number } }>('/leads', {
    method: 'POST',
    body: payload,
    client: true,
  });
  return res.data;
}

export async function submitPricingLead(payload: PricingLeadPayload): Promise<{ id: number }> {
  const res = await apiFetch<{ data: { id: number } }>('/leads/pricing', {
    method: 'POST',
    body: payload,
    client: true,
  });
  return res.data;
}

export async function saveConsultationEstimate(
  leadId: number,
  phone: string,
  estimate: string,
): Promise<void> {
  // Called from server actions — use internal API URL, not browser public URL.
  await apiFetch(`/leads/${leadId}/consultation-estimate`, {
    method: 'POST',
    body: { phone, estimate },
  });
}

export async function uploadPhoto(file: File, leadId: number): Promise<{ id: number }> {
  const { PUBLIC_API_URL } = await import('./config');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('consent', 'true');
  fd.append('lead_id', String(leadId));
  const res = await fetch(`${PUBLIC_API_URL}/uploads`, { method: 'POST', body: fd, credentials: 'omit' });
  if (!res.ok) {
    const json = await res.json().catch(() => null) as { message?: string; errors?: Record<string, string[]> } | null;
    const msg = json?.errors?.file?.[0] ?? json?.message ?? 'بارگذاری تصویر ناموفق بود.';
    throw new Error(msg);
  }
  const json = await res.json();
  return json.data;
}
