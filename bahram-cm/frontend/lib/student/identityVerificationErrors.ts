/** Persian error copy for the student identity verification flow. */

export const IDENTITY_ERROR_BY_CODE: Record<string, string> = {
  invalid_national_code:
    'کد ملی واردشده معتبر نیست. لطفاً ۱۰ رقم کد ملی خود را بدون خط تیره بررسی و دوباره وارد کنید.',
  duplicate_national_code:
    'این کد ملی قبلاً در سامانه ثبت شده است. اگر قبلاً با شمارهٔ دیگری ثبت‌نام کرده‌اید، با همان حساب وارد شوید؛ در غیر این صورت از بخش پشتیبانی راهنمایی بگیرید.',
  draft_required:
    'ابتدا مرحلهٔ «اطلاعات هویتی» را تکمیل و ذخیره کنید، سپس مدارک را بارگذاری کنید.',
  server_error:
    'در حال حاضر ارتباط با سرور برقرار نشد. چند لحظه بعد دوباره تلاش کنید؛ اگر ادامه داشت با پشتیبانی تماس بگیرید.',
};

export const IDENTITY_ERROR_TITLE_BY_CODE: Record<string, string> = {
  invalid_national_code: 'کد ملی نامعتبر',
  duplicate_national_code: 'کد ملی تکراری',
  draft_required: 'ابتدا اطلاعات هویتی را ذخیره کنید',
  cooldown: 'لطفاً کمی صبر کنید',
  status_locked: 'پرونده در حال بررسی',
  artifacts: 'مدارک ناقص',
  server_error: 'خطای سرور',
};

export const IDENTITY_CLIENT_ERROR_TITLES = {
  step1: 'اطلاعات هویتی ناقص',
  artifacts: 'مدارک ناقص',
} as const;

export const IDENTITY_CLIENT_ERRORS = {
  step1Incomplete: 'لطفاً همهٔ فیلدهای مرحلهٔ اطلاعات هویتی را تکمیل کنید.',
  firstName: 'نام (مطابق کارت ملی) را وارد کنید.',
  lastName: 'نام خانوادگی (مطابق کارت ملی) را وارد کنید.',
  nationalCodeLength: 'کد ملی باید ۱۰ رقم باشد.',
  dateOfBirth: 'تاریخ تولد را انتخاب کنید.',
  gender: 'جنسیت را انتخاب کنید.',
  city: 'شهر محل سکونت را وارد کنید.',
  artifacts: 'برای ارسال پرونده، تصویر کارت ملی و ویدیوی سلفی را تکمیل کنید.',
  cardMissing: 'تصویر کارت ملی را بارگذاری کنید.',
  videoMissing: 'ویدیوی سلفی را ضبط و تأیید کنید.',
} as const;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message_fa?: string;
    details?: Record<string, string[]>;
  };
  errors?: Record<string, string[]>;
  message?: string;
};

export function resolveIdentityApiError(err: unknown, fallback: string): string {
  return resolveIdentityApiErrorDetail(err, fallback).message;
}

export function resolveIdentityApiErrorDetail(
  err: unknown,
  fallback: string,
): { code?: string; title: string; message: string } {
  const e = err as { status?: number; payload?: ApiErrorPayload };
  const payload = e?.payload;
  const code = payload?.error?.code;

  const details = payload?.error?.details ?? payload?.errors;
  const detailMessage = details
    ? Object.values(details).flat().find((line) => typeof line === 'string' && line.trim())
    : undefined;

  if (payload?.error?.message_fa) {
    return {
      code,
      title: identityErrorTitle(code, detailMessage ?? payload.error.message_fa),
      message: payload.error.message_fa,
    };
  }

  if (detailMessage) {
    return {
      code,
      title: identityErrorTitle(code, detailMessage),
      message: detailMessage,
    };
  }

  if (code && IDENTITY_ERROR_BY_CODE[code]) {
    return {
      code,
      title: identityErrorTitle(code, IDENTITY_ERROR_BY_CODE[code]),
      message: IDENTITY_ERROR_BY_CODE[code],
    };
  }

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return {
      code,
      title: identityErrorTitle(code, payload.message),
      message: payload.message,
    };
  }

  if (e?.status === 500) {
    return {
      code: 'server_error',
      title: IDENTITY_ERROR_TITLE_BY_CODE.server_error,
      message: IDENTITY_ERROR_BY_CODE.server_error,
    };
  }

  if (e?.status === 429) {
    return {
      code: 'cooldown',
      title: IDENTITY_ERROR_TITLE_BY_CODE.cooldown,
      message: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
    };
  }

  if (e?.status === 405) {
    return {
      title: 'درخواست نامعتبر',
      message: 'درخواست نامعتبر است. صفحه را یک‌بار رفرش کنید و دوباره تلاش کنید.',
    };
  }

  if (e?.status === 404) {
    return {
      title: 'سرویس در دسترس نیست',
      message: 'سرویس تأیید هویت در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.',
    };
  }

  return { code, title: 'خطا در انجام درخواست', message: fallback };
}

function identityErrorTitle(code: string | undefined, message: string): string {
  if (code && IDENTITY_ERROR_TITLE_BY_CODE[code]) {
    return IDENTITY_ERROR_TITLE_BY_CODE[code];
  }

  if (message.includes('کد ملی قبلاً')) return IDENTITY_ERROR_TITLE_BY_CODE.duplicate_national_code;
  if (message.includes('کد ملی') && message.includes('معتبر')) return IDENTITY_ERROR_TITLE_BY_CODE.invalid_national_code;
  if (message.includes('پیش‌نویس') || message.includes('اطلاعات هویتی')) {
    return IDENTITY_ERROR_TITLE_BY_CODE.draft_required;
  }
  if (message.includes('صبر کنید')) return IDENTITY_ERROR_TITLE_BY_CODE.cooldown;
  if (message.includes('در حال بررسی')) return IDENTITY_ERROR_TITLE_BY_CODE.status_locked;
  if (message.includes('کارت ملی') || message.includes('سلفی')) return IDENTITY_ERROR_TITLE_BY_CODE.artifacts;

  return 'خطا در انجام درخواست';
}

export function validateIdentityStep1(draft: {
  first_name: string;
  last_name: string;
  national_code: string;
  date_of_birth: string;
  gender: string;
  city: string;
}): string | null {
  if (!draft.first_name.trim()) return IDENTITY_CLIENT_ERRORS.firstName;
  if (!draft.last_name.trim()) return IDENTITY_CLIENT_ERRORS.lastName;
  if (draft.national_code.replace(/\D/g, '').length !== 10) return IDENTITY_CLIENT_ERRORS.nationalCodeLength;
  if (!draft.date_of_birth.trim()) return IDENTITY_CLIENT_ERRORS.dateOfBirth;
  if (!draft.gender.trim()) return IDENTITY_CLIENT_ERRORS.gender;
  if (!draft.city.trim()) return IDENTITY_CLIENT_ERRORS.city;
  return null;
}
