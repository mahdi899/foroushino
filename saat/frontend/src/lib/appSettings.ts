export interface RuntimeAppSettings {
  minCallDurationSec: number
  callLockMinutes: number
  leadPoolAutoReturnHours: number
  payoutMinimumAmount: number
  nativeCallEnabled: boolean
  voipEnabled: boolean
  defaultCallMethod: 'native' | 'voip'
  voipProvider: string
  voipFallbackToNative: boolean
  powerDialDefault: boolean
  qaSamplePercent: number
}

export const DEFAULT_RUNTIME_APP_SETTINGS: RuntimeAppSettings = {
  minCallDurationSec: 0,
  callLockMinutes: 30,
  leadPoolAutoReturnHours: 48,
  payoutMinimumAmount: 100_000,
  nativeCallEnabled: true,
  voipEnabled: false,
  defaultCallMethod: 'native',
  voipProvider: 'asterisk',
  voipFallbackToNative: true,
  powerDialDefault: false,
  qaSamplePercent: 10,
}

export function mapRuntimeAppSettings(dto: Record<string, unknown>): RuntimeAppSettings {
  return {
    minCallDurationSec: Math.max(0, Number(dto.min_call_duration_sec ?? 0)),
    callLockMinutes: Math.max(1, Number(dto.call_lock_minutes ?? 30)),
    leadPoolAutoReturnHours: Math.max(1, Number(dto.lead_pool_auto_return_hours ?? 48)),
    payoutMinimumAmount: Math.max(0, Number(dto.payout_minimum_amount ?? 100_000)),
    nativeCallEnabled: dto.native_call_enabled !== false,
    voipEnabled: dto.voip_enabled === true,
    defaultCallMethod: dto.default_call_method === 'voip' ? 'voip' : 'native',
    voipProvider: String(dto.voip_provider ?? 'asterisk'),
    voipFallbackToNative: dto.voip_fallback_to_native !== false,
    powerDialDefault: dto.power_dial_default === true,
    qaSamplePercent: Math.max(0, Math.min(100, Number(dto.qa_sample_percent ?? 10))),
  }
}

export const ADMIN_SETTING_LABELS: Record<string, { label: string; hint?: string; type?: 'number' | 'text' | 'boolean' | 'select'; options?: { value: string; label: string }[] }> = {
  min_call_duration_sec: {
    label: 'حداقل مدت تماس',
    hint: 'ثانیه — ۰ یعنی بدون محدودیت',
    type: 'number',
  },
  call_lock_minutes: {
    label: 'مدت قفل مشتری',
    hint: 'دقیقه پس از واگذاری به کارشناس',
    type: 'number',
  },
  native_call_enabled: {
    label: 'تماس سیم‌کارت',
    hint: 'فعال/غیرفعال کردن تماس native',
    type: 'boolean',
  },
  voip_enabled: {
    label: 'تماس VoIP',
    hint: 'فعال‌سازی تماس درون‌برنامه‌ای (نیاز به پیکربندی سرور)',
    type: 'boolean',
  },
  default_call_method: {
    label: 'روش پیش‌فرض تماس',
    type: 'select',
    options: [
      { value: 'native', label: 'سیم‌کارت' },
      { value: 'voip', label: 'VoIP' },
    ],
  },
  voip_provider: {
    label: 'ارائه‌دهنده VoIP',
    hint: 'مثال: asterisk, freepbx',
    type: 'text',
  },
  voip_fallback_to_native: {
    label: 'بازگشت خودکار به سیم‌کارت',
    hint: 'اگر VoIP در دسترس نبود',
    type: 'boolean',
  },
  lead_pool_auto_return_hours: {
    label: 'بازگشت خودکار به استخر',
    hint: 'ساعت',
    type: 'number',
  },
  power_dial_default: {
    label: 'پاور دیال پیش‌فرض',
    hint: 'برای کارشناسان جدید فعال شود',
    type: 'boolean',
  },
  qa_sample_percent: {
    label: 'نمونه‌گیری QA',
    hint: 'درصد تماس‌های موفق برای بررسی کیفیت',
    type: 'number',
  },
  payout_minimum_amount: {
    label: 'حداقل مبلغ برداشت',
    hint: 'تومان',
    type: 'number',
  },
}
