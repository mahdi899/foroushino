export interface RuntimeAppSettings {
  minCallDurationSec: number
  callLockMinutes: number
}

export const DEFAULT_RUNTIME_APP_SETTINGS: RuntimeAppSettings = {
  minCallDurationSec: 0,
  callLockMinutes: 30,
}

export function mapRuntimeAppSettings(dto: Record<string, unknown>): RuntimeAppSettings {
  return {
    minCallDurationSec: Math.max(0, Number(dto.min_call_duration_sec ?? 0)),
    callLockMinutes: Math.max(1, Number(dto.call_lock_minutes ?? 30)),
  }
}

export const ADMIN_SETTING_LABELS: Record<string, { label: string; hint?: string; type?: 'number' | 'text' }> = {
  min_call_duration_sec: {
    label: 'حداقل مدت تماس',
    hint: 'ثانیه — ۰ یعنی بدون محدودیت (فعلاً غیرفعال)',
    type: 'number',
  },
  call_lock_minutes: {
    label: 'مدت قفل مشتری',
    hint: 'دقیقه پس از واگذاری به کارشناس',
    type: 'number',
  },
  lead_pool_auto_return_hours: {
    label: 'بازگشت خودکار به استخر',
    hint: 'ساعت',
    type: 'number',
  },
  payout_minimum_amount: {
    label: 'حداقل مبلغ برداشت',
    hint: 'تومان',
    type: 'number',
  },
}
