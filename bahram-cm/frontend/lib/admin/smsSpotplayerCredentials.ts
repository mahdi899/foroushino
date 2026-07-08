'use server';

import { adminFetch } from '@/lib/auth/session';
import type {
  SmsSpotplayerCredentialsForm,
  SmsSpotplayerCredentialsView,
} from './smsSpotplayerCredentials.types';

export async function loadSmsSpotplayerCredentialsSettings(): Promise<SmsSpotplayerCredentialsView | null> {
  try {
    const res = await adminFetch<{ data: SmsSpotplayerCredentialsView }>(
      '/panel/settings/sms-spotplayer-credentials',
    );
    return res.data;
  } catch {
    return null;
  }
}

export async function saveSmsSpotplayerCredentialsSettingsAction(
  form: SmsSpotplayerCredentialsForm,
): Promise<{ ok: boolean; data?: SmsSpotplayerCredentialsView; error?: string }> {
  try {
    const res = await adminFetch<{ data: SmsSpotplayerCredentialsView }>(
      '/panel/settings/sms-spotplayer-credentials',
      {
        method: 'PUT',
        body: {
          melipayamak_username: form.melipayamakUsername.trim(),
          melipayamak_password_input: form.melipayamakPasswordInput.trim(),
          melipayamak_sender_number: form.melipayamakSenderNumber.trim() || null,
          melipayamak_active: form.melipayamakActive,
          kavenegar_api_key_input: form.kavenegarApiKeyInput.trim(),
          kavenegar_sender_number: form.kavenegarSenderNumber.trim() || null,
          kavenegar_active: form.kavenegarActive,
          spotplayer_api_key_input: form.spotplayerApiKeyInput.trim(),
          spotplayer_base_url: form.spotplayerBaseUrl.trim() || null,
          is_spotplayer_active: form.spotplayerActive,
          default_license_duration:
            form.spotplayerDefaultLicenseDuration.trim() !== ''
              ? Number(form.spotplayerDefaultLicenseDuration)
              : null,
        },
      },
    );
    return { ok: true, data: res.data };
  } catch (e) {
    const payload =
      e && typeof e === 'object' && 'payload' in e
        ? (e as { payload?: { message?: string; errors?: Record<string, string[]> } }).payload
        : undefined;
    const firstFieldError = payload?.errors ? Object.values(payload.errors).flat()[0] : undefined;
    const message = firstFieldError ?? payload?.message ?? (e instanceof Error ? e.message : 'خطا در ذخیره کلیدها');
    return { ok: false, error: message };
  }
}

export async function testSmsSpotplayerCredentialsAction(
  target: 'melipayamak' | 'kavenegar' | 'spotplayer',
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await adminFetch<{ data: { ok: boolean; message: string } }>(
      '/panel/settings/sms-spotplayer-credentials/test',
      { method: 'POST', body: { target } },
    );
    return res.data;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'خطا در تست اتصال' };
  }
}
