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

export type AdminSettingMeta = {
  label: string
  hint?: string
  type?: 'number' | 'text' | 'boolean' | 'select' | 'url' | 'password'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export const ADMIN_SETTING_LABELS: Record<string, AdminSettingMeta> = {
  min_call_duration_sec: {
    label: 'حداقل مدت تماس',
    hint: 'ثانیه — ۰ یعنی بدون محدودیت برای ثبت نتیجه',
    type: 'number',
    placeholder: '۰',
  },
  call_lock_minutes: {
    label: 'مدت قفل مشتری',
    hint: 'دقیقه — مدت نگهداری مشتری روی کارشناس پس از واگذاری',
    type: 'number',
    placeholder: '۳۰',
  },
  native_call_enabled: {
    label: 'تماس با سیم‌کارت',
    hint: 'اجازه تماس از طریق شماره‌گیر گوشی',
    type: 'boolean',
  },
  voip_enabled: {
    label: 'تماس VoIP',
    hint: 'تماس درون‌برنامه‌ای از طریق سرور تلفن',
    type: 'boolean',
  },
  default_call_method: {
    label: 'روش پیش‌فرض تماس',
    hint: 'اولین گزینه‌ای که کارشناس می‌بیند',
    type: 'select',
    options: [
      { value: 'native', label: 'سیم‌کارت گوشی' },
      { value: 'voip', label: 'VoIP (درون برنامه)' },
    ],
  },
  voip_provider: {
    label: 'سرویس VoIP',
    hint: 'نوع اتصال به مرکز تماس',
    type: 'select',
    options: [
      { value: 'asterisk', label: 'Asterisk' },
      { value: 'freepbx', label: 'FreePBX' },
      { value: 'custom', label: 'سفارشی / دیگر' },
    ],
  },
  voip_fallback_to_native: {
    label: 'بازگشت خودکار به سیم‌کارت',
    hint: 'اگر VoIP در دسترس نبود، تماس از گوشی برقرار شود',
    type: 'boolean',
  },
  lead_pool_auto_return_hours: {
    label: 'بازگشت خودکار به استخر',
    hint: 'ساعت — مشتری بدون اقدام به استخر برمی‌گردد',
    type: 'number',
    placeholder: '۴۸',
  },
  payout_minimum_amount: {
    label: 'حداقل مبلغ برداشت',
    hint: 'تومان — کمتر از این مبلغ درخواست تسویه ممکن نیست',
    type: 'number',
    placeholder: '۱۰۰۰۰۰',
  },
  power_dial_default: {
    label: 'تماس پی‌درپی پیش‌فرض',
    hint: 'برای کارشناسان تازه‌وارد فعال باشد',
    type: 'boolean',
  },
  qa_sample_percent: {
    label: 'نمونه‌گیری کنترل کیفیت',
    hint: 'درصد تماس‌های موفق که برای QA انتخاب می‌شوند',
    type: 'number',
    placeholder: '۱۰',
  },
  meli_pattern_course: {
    label: 'کد پترن — لینک دوره',
    hint: 'کد پترن ملی‌پیامک — ۰ یعنی غیرفعال',
    type: 'number',
    placeholder: 'مثال: ۱۰۰۱',
  },
  meli_sms_link_course: {
    label: 'آدرس لینک دوره',
    hint: 'لینک مقصد با ردیابی کارشناس',
    type: 'url',
    placeholder: 'https://rostami.app/courses',
  },
  meli_pattern_channel: {
    label: 'کد پترن — لینک کانال',
    hint: 'کد پترن ملی‌پیامک — ۰ یعنی غیرفعال',
    type: 'number',
    placeholder: 'مثال: ۱۰۰۲',
  },
  meli_sms_link_channel: {
    label: 'آدرس لینک کانال',
    hint: 'لینک کانال تلگرام یا صفحه معرفی',
    type: 'url',
    placeholder: 'https://t.me/RostamiAppBot',
  },
  meli_pattern_register: {
    label: 'کد پترن — ثبت‌نام',
    hint: 'کد پترن ملی‌پیامک — ۰ یعنی غیرفعال',
    type: 'number',
    placeholder: 'مثال: ۱۰۰۳',
  },
  meli_sms_link_register: {
    label: 'آدرس لینک ثبت‌نام',
    hint: 'صفحه ثبت‌نام یا فرم مشتری',
    type: 'url',
    placeholder: 'https://rostami.app/register',
  },
  meli_pattern_payment: {
    label: 'کد پترن — پرداخت',
    hint: 'کد پترن ملی‌پیامک — ۰ یعنی غیرفعال',
    type: 'number',
    placeholder: 'مثال: ۱۰۰۴',
  },
  meli_sms_link_payment: {
    label: 'آدرس لینک پرداخت',
    hint: 'درگاه یا صفحه پرداخت',
    type: 'url',
    placeholder: 'https://rostami.app/payment',
  },
  meli_pattern_custom: {
    label: 'کد پترن — پیامک دلخواه',
    hint: 'برای متن آزاد کارشناس — ۰ یعنی غیرفعال',
    type: 'number',
    placeholder: 'مثال: ۱۰۰۵',
  },
  melipayamak_username: {
    label: 'نام کاربری پنل ملی‌پیامک',
    hint: 'همان نام کاربری ورود به payamak-panel.com',
    type: 'text',
    placeholder: 'username',
  },
  melipayamak_password: {
    label: 'رمز عبور پنل ملی‌پیامک',
    hint: 'برای تغییر ندادن، خالی بگذارید',
    type: 'password',
    placeholder: '••••••••',
  },
  melipayamak_rest_url: {
    label: 'آدرس REST API',
    hint: 'معمولاً نیاز به تغییر نیست',
    type: 'url',
    placeholder: 'https://rest.payamak-panel.com/api/SendSMS',
  },
  meli_pattern_login: {
    label: 'کد پترن — OTP ورود',
    hint: 'کد پترن ملی‌پیامک برای پیامک کد ورود — ۰ یعنی غیرفعال (در صورت اتصال تلگرام، از تلگرام استفاده می‌شود)',
    type: 'number',
    placeholder: 'مثال: ۲۰۰۱',
  },
}

export const ADMIN_TELEPHONY_KEYS = [
  'native_call_enabled',
  'voip_enabled',
  'default_call_method',
  'voip_provider',
  'voip_fallback_to_native',
] as const

export const ADMIN_OPERATIONAL_KEYS = [
  'min_call_duration_sec',
  'call_lock_minutes',
  'lead_pool_auto_return_hours',
  'payout_minimum_amount',
] as const

export const ADMIN_QA_KEYS = ['power_dial_default', 'qa_sample_percent'] as const

export const ADMIN_SMS_PANEL_KEYS = [
  'melipayamak_username',
  'melipayamak_password',
  'melipayamak_rest_url',
  'meli_pattern_login',
] as const

export const ADMIN_SMS_TEMPLATE_GROUPS = [
  {
    title: 'لینک دوره',
    description: 'ارسال معرفی دوره برای مشتری',
    patternKey: 'meli_pattern_course',
    linkKey: 'meli_sms_link_course',
  },
  {
    title: 'لینک کانال',
    description: 'دعوت به کانال تلگرام یا شبکه اجتماعی',
    patternKey: 'meli_pattern_channel',
    linkKey: 'meli_sms_link_channel',
  },
  {
    title: 'لینک ثبت‌نام',
    description: 'هدایت مشتری به فرم ثبت‌نام',
    patternKey: 'meli_pattern_register',
    linkKey: 'meli_sms_link_register',
  },
  {
    title: 'لینک پرداخت',
    description: 'ارسال صفحه پرداخت یا پیش‌فاکتور',
    patternKey: 'meli_pattern_payment',
    linkKey: 'meli_sms_link_payment',
  },
  {
    title: 'پیامک دلخواه',
    description: 'متن آزاد کارشناس — فقط پترن لازم است',
    patternKey: 'meli_pattern_custom',
    linkKey: null,
  },
] as const

export const ADMIN_KNOWN_SETTING_KEYS = new Set<string>([
  ...ADMIN_TELEPHONY_KEYS,
  ...ADMIN_OPERATIONAL_KEYS,
  ...ADMIN_QA_KEYS,
  ...ADMIN_SMS_PANEL_KEYS,
  'melipayamak_password_configured',
  ...ADMIN_SMS_TEMPLATE_GROUPS.flatMap((group) =>
    group.linkKey ? [group.patternKey, group.linkKey] : [group.patternKey],
  ),
])

export function getAdminSettingMeta(key: string): AdminSettingMeta {
  return (
    ADMIN_SETTING_LABELS[key] ?? {
      label: key,
      hint: 'تنظیم سفارشی سیستم',
      type: 'text',
    }
  )
}

const ADMIN_NUMERIC_BOUNDS: Record<string, { min: number; max: number }> = {
  call_lock_minutes: { min: 1, max: 180 },
  min_call_duration_sec: { min: 0, max: 3600 },
  lead_pool_auto_return_hours: { min: 1, max: 720 },
  payout_minimum_amount: { min: 0, max: 999_999_999 },
  qa_sample_percent: { min: 0, max: 100 },
  meli_pattern_course: { min: 0, max: 999_999 },
  meli_pattern_channel: { min: 0, max: 999_999 },
  meli_pattern_register: { min: 0, max: 999_999 },
  meli_pattern_payment: { min: 0, max: 999_999 },
  meli_pattern_custom: { min: 0, max: 999_999 },
  meli_pattern_login: { min: 0, max: 999_999 },
}

type SettingValue = string | number | boolean | null

function asBoolean(value: SettingValue): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function clampNumber(key: string, value: number): number {
  const bounds = ADMIN_NUMERIC_BOUNDS[key]
  if (!bounds) return value
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

/** Normalize form state before PATCH — omit empties, coerce types, clamp ranges. */
export function prepareAdminSettingsForSave(
  settings: Record<string, SettingValue>,
): Record<string, SettingValue> {
  const prepared: Record<string, SettingValue> = {}

  for (const [key, raw] of Object.entries(settings)) {
    if (raw === '' || raw == null) continue
    if (key === 'melipayamak_password_configured') continue

    const meta = getAdminSettingMeta(key)

    if (meta.type === 'password' && String(raw).trim() === '') {
      continue
    }

    if (meta.type === 'boolean') {
      prepared[key] = asBoolean(raw)
      continue
    }

    if (meta.type === 'number') {
      const num = Number(raw)
      if (!Number.isFinite(num)) continue
      prepared[key] = clampNumber(key, Math.trunc(num))
      continue
    }

    if (meta.type === 'select') {
      prepared[key] = String(raw)
      continue
    }

    prepared[key] = typeof raw === 'string' ? raw.trim() : String(raw)
  }

  return prepared
}
