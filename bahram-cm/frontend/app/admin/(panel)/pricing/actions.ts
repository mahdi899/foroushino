'use server';

import { adminFetch } from '@/lib/auth/session';
import type { ApiTreatmentLine } from '@/lib/api/types';

export interface AdminInstallmentPlan {
  id: number;
  name: string;
  treatment_line_slug: string | null;
  down_payment_pct: number;
  max_months: number;
  allowed_months: number[];
  fee_pct: number;
  requires_cheque: boolean;
  terms_text: string | null;
}

export async function getAdminTreatmentLines(): Promise<ApiTreatmentLine[]> {
  try {
    const res = await adminFetch<{ data: ApiTreatmentLine[] }>('/treatment-lines');
    return res.data;
  } catch {
    return [];
  }
}

export async function updateTreatmentBrand(
  brandId: number,
  payload: Partial<{ name_fa: string; short_copy: string; price_from: number; badge: string; image_url: string }>,
): Promise<boolean> {
  try {
    await adminFetch(`/treatment-brands/${brandId}`, { method: 'PATCH', body: payload });
    return true;
  } catch {
    return false;
  }
}

export async function getAdminInstallmentPlans(): Promise<AdminInstallmentPlan[]> {
  try {
    const res = await adminFetch<{ data: AdminInstallmentPlan[] }>('/installment-plans');
    return res.data;
  } catch {
    return [];
  }
}

export async function updateInstallmentPlan(
  planId: number,
  payload: Partial<{ down_payment_pct: number; max_months: number; fee_pct: number; requires_cheque: boolean; terms_text: string }>,
): Promise<boolean> {
  try {
    await adminFetch(`/installment-plans/${planId}`, { method: 'PATCH', body: payload });
    return true;
  } catch {
    return false;
  }
}

export async function getPricingSettings(): Promise<Record<string, unknown>> {
  try {
    const res = await adminFetch<{ data: Record<string, unknown> }>('/settings/pricing');
    return res.data;
  } catch {
    return {};
  }
}

export async function savePricingSettings(values: Record<string, unknown>): Promise<boolean> {
  try {
    await adminFetch('/settings/pricing', { method: 'PUT', body: { values } });
    return true;
  } catch {
    return false;
  }
}
