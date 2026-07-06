'use server';

import { adminFetch } from '@/lib/auth/session';
import type { ImageOptimizerForm, ImageOptimizerView } from './imageOptimizer.types';

export async function loadImageOptimizerSettings(): Promise<ImageOptimizerView | null> {
  try {
    const res = await adminFetch<{ data: ImageOptimizerView }>('/manage/settings/image-optimizer');
    return res.data;
  } catch {
    return null;
  }
}

export async function saveImageOptimizerSettingsAction(
  form: ImageOptimizerForm,
): Promise<{ ok: boolean; data?: ImageOptimizerView; error?: string }> {
  try {
    const res = await adminFetch<{ data: ImageOptimizerView }>('/manage/settings/image-optimizer', {
      method: 'PUT',
      body: {
        tinify_key_input: form.tinifyKeyInput.trim(),
        resmush_enabled: form.resmushEnabled,
        resmush_quality: form.resmushQuality,
        resmush_referer: form.resmushReferer.trim(),
      },
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'خطا در ذخیره تنظیمات' };
  }
}

export async function testImageOptimizerAction(
  target: 'tinify' | 'resmush',
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await adminFetch<{ data: { ok: boolean; message: string } }>(
      '/manage/settings/image-optimizer/test',
      { method: 'POST', body: { target } },
    );
    return res.data;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'خطا در تست اتصال' };
  }
}
