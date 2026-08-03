/** Human Persian labels — avoid KYC / Level wording in student UI. */

export const IDENTITY_STATUS_FA: Record<string, string> = {
  not_started: 'هنوز شروع نشده',
  draft: 'در حال تکمیل',
  submitted: 'ارسال شده — در صف بررسی',
  under_review: 'در حال بررسی توسط تیم',
  needs_correction: 'نیاز به اصلاح مدارک',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

export const ACCOUNT_STATUS_FA: Record<number, string> = {
  1: 'حساب پایه',
  2: 'هویت تأییدشده',
  3: 'تأیید کامل حساب',
};

export const ACCOUNT_STATUS_HINT_FA: Record<number, string> = {
  1: 'تأیید هویت و سات',
  2: 'هویت شما تأیید شده. برای برداشت کش‌بک، مالکیت شماره موبایل را هم تأیید کنید.',
  3: 'حساب شما کاملاً تأیید شده و امکان برداشت فعال است.',
};

/** Contextual hints for the profile verification card (by identity workflow status). */
export const IDENTITY_CARD_HINT_FA: Record<string, string> = {
  not_started: ACCOUNT_STATUS_HINT_FA[1],
  draft: 'فرآیند تأیید هویت نیمه‌کاره است. آن را تکمیل کنید تا پرونده برای بررسی ارسال شود.',
  submitted: 'پرونده شما ثبت شده و در صف بررسی است. نتیجه از طریق اعلان به شما اطلاع داده می‌شود.',
  under_review: 'تیم در حال بررسی مدارک شماست. لطفاً تا اعلام نتیجه صبور باشید.',
  needs_correction: 'برخی موارد پرونده نیاز به اصلاح دارد. لطفاً مدارک را به‌روز و دوباره ارسال کنید.',
  rejected: 'پرونده قبلی رد شده است. با اصلاح اطلاعات می‌توانید دوباره ارسال کنید.',
  approved: ACCOUNT_STATUS_HINT_FA[2],
};

export const SAT_MEMBERSHIP_FA: Record<string, { label: string; hint: string }> = {
  inactive: {
    label: 'دسترسی سات قفل است',
    hint: 'پس از پذیرش درخواست و تأیید هویت، دسترسی فعال می‌شود.',
  },
  active: {
    label: 'عضویت سات فعال است',
    hint: 'به امکانات ویژه سات دسترسی دارید.',
  },
  suspended: {
    label: 'عضویت سات معلق است',
    hint: 'برای فعال‌سازی مجدد با پشتیبانی تماس بگیرید.',
  },
};

export function accountStatusLabel(level?: number | null): string {
  if (!level) return ACCOUNT_STATUS_FA[1];
  return ACCOUNT_STATUS_FA[level] ?? ACCOUNT_STATUS_FA[1];
}

export function identityStatusLabel(status?: string | null): string {
  if (!status) return IDENTITY_STATUS_FA.not_started;
  return IDENTITY_STATUS_FA[status] ?? status;
}

/** Admin stores reason codes; always show Persian to the student. */
export const IDENTITY_CORRECTION_FA: Record<string, string> = {
  national_card_unreadable: 'تصویر کارت ملی خوانا نیست',
  national_card_not_yours: 'کارت ملی متعلق به شما نیست',
  selfie_unsuitable: 'ویدیوی سلفی مناسب نیست',
  info_mismatch: 'اطلاعات با مدارک مطابقت ندارد',
  mobile_national_mismatch: 'شماره موبایل با کد ملی مطابقت ندارد',
  image_incomplete: 'تصویر ناقص است',
  other: 'سایر',
};

export function identityCorrectionLabel(item: string): string {
  const key = item.trim();
  return IDENTITY_CORRECTION_FA[key] ?? key;
}

export const IDENTITY_GENDER_FA: Record<string, string> = {
  male: 'آقا',
  female: 'خانم',
};

export const IDENTITY_GENDER_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'male', label: 'آقا' },
  { value: 'female', label: 'خانم' },
];

export function identityGenderLabel(gender?: string | null): string {
  if (!gender) return '';
  return IDENTITY_GENDER_FA[gender] ?? gender;
}
