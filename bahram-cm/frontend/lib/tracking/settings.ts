import 'server-only';

import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';
import type { TrackingConfigAdminView, TrackingSettingsForm, TrackingStoredConfig } from './types';

const TRACKING_GROUP = 'tracking';
const TRACKING_KEY = 'config';

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

function envVerification(): string | null {
  return process.env.GOOGLE_SITE_VERIFICATION?.trim() || null;
}

function envIndexNow(): string | null {
  return process.env.INDEXNOW_KEY?.trim() || null;
}

function envGa4PropertyId(): string | null {
  return process.env.GA4_PROPERTY_ID?.trim() || null;
}

function envHasServiceAccount(): boolean {
  if (process.env.GA4_SERVICE_ACCOUNT_JSON?.trim()) return true;
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  return Boolean(path);
}

function serviceAccountEmail(json: string | undefined): string | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as { client_email?: string };
    const email = parsed.client_email?.trim();
    return email || null;
  } catch {
    return null;
  }
}

function mergeStored(raw: Partial<TrackingStoredConfig> | null): TrackingStoredConfig {
  return {
    analytics_enabled: raw?.analytics_enabled ?? false,
    ga4_measurement_id: raw?.ga4_measurement_id?.trim() ?? '',
    gtm_container_id: raw?.gtm_container_id?.trim() ?? '',
    ga4_dashboard_enabled: raw?.ga4_dashboard_enabled ?? false,
    ga4_property_id: raw?.ga4_property_id?.trim() ?? '',
    ga4_service_account_json: raw?.ga4_service_account_json?.trim() || undefined,
    search_console_enabled: raw?.search_console_enabled ?? false,
    site_verification_code: raw?.site_verification_code?.trim() ?? '',
    indexnow_key: raw?.indexnow_key?.trim() || undefined,
  };
}

export async function getStoredTrackingConfig(): Promise<TrackingStoredConfig> {
  const raw = await getSettingBlob<Partial<TrackingStoredConfig>>(TRACKING_GROUP, TRACKING_KEY);
  return mergeStored(raw);
}

export async function getTrackingConfigAdminView(): Promise<TrackingConfigAdminView> {
  const stored = await getStoredTrackingConfig();
  const panelIndexNow = stored.indexnow_key?.trim();
  const hasStoredAccount = Boolean(stored.ga4_service_account_json);

  return {
    ga4DashboardEnabled: stored.ga4_dashboard_enabled ?? false,
    ga4PropertyId: stored.ga4_property_id ?? '',
    hasGa4ServiceAccount: hasStoredAccount || envHasServiceAccount(),
    ga4ServiceAccountEmail: serviceAccountEmail(stored.ga4_service_account_json),
    searchConsoleEnabled: stored.search_console_enabled,
    siteVerificationCode: stored.site_verification_code,
    hasIndexNowKey: Boolean(panelIndexNow),
    indexNowKeyPreview: panelIndexNow ? maskSecret(panelIndexNow) : null,
    envFallback: {
      ga4Property: Boolean(envGa4PropertyId()),
      ga4ServiceAccount: envHasServiceAccount(),
      verification: Boolean(envVerification()),
      indexNow: Boolean(envIndexNow()),
    },
  };
}

function validateServiceAccountJson(raw: string): { ok: true; json: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'فایل JSON Service Account خالی است.' };
  }
  try {
    const parsed = JSON.parse(trimmed) as { client_email?: string; private_key?: string };
    if (!parsed.client_email?.trim() || !parsed.private_key?.trim()) {
      return { ok: false, error: 'JSON باید شامل client_email و private_key باشد.' };
    }
    return { ok: true, json: trimmed };
  } catch {
    return { ok: false, error: 'فرمت JSON نامعتبر است.' };
  }
}

export async function saveTrackingConfig(form: TrackingSettingsForm): Promise<{ ok: boolean; error?: string }> {
  const current = await getStoredTrackingConfig();

  if (form.ga4DashboardEnabled) {
    const propertyId = form.ga4PropertyId.trim();
    if (!propertyId) {
      return { ok: false, error: 'شناسه Property GA4 را وارد کنید.' };
    }
    if (!/^\d+$/.test(propertyId)) {
      return { ok: false, error: 'شناسه Property باید عدد باشد (نه G-XXXXXXXX).' };
    }
    const hasAccount = Boolean(current.ga4_service_account_json) || envHasServiceAccount();
    if (!hasAccount && !form.ga4ServiceAccountJsonInput.trim()) {
      return { ok: false, error: 'فایل JSON Service Account را آپلود یا paste کنید.' };
    }
  }

  const next: TrackingStoredConfig = {
    analytics_enabled: current.analytics_enabled,
    ga4_measurement_id: current.ga4_measurement_id,
    gtm_container_id: current.gtm_container_id,
    ga4_dashboard_enabled: form.ga4DashboardEnabled,
    ga4_property_id: form.ga4PropertyId.trim(),
    search_console_enabled: form.searchConsoleEnabled,
    site_verification_code: form.siteVerificationCode.trim(),
  };

  const accountInput = form.ga4ServiceAccountJsonInput.trim();
  if (accountInput) {
    const validated = validateServiceAccountJson(accountInput);
    if (!validated.ok) return validated;
    next.ga4_service_account_json = validated.json;
  } else if (current.ga4_service_account_json) {
    next.ga4_service_account_json = current.ga4_service_account_json;
  }

  const indexNowInput = form.indexNowKeyInput.trim();
  if (indexNowInput) {
    next.indexnow_key = indexNowInput;
  } else if (current.indexnow_key) {
    next.indexnow_key = current.indexnow_key;
  }

  return saveSettingBlob(TRACKING_GROUP, TRACKING_KEY, next);
}
