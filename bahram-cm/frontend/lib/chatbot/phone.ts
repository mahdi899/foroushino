const PHONE_SAVED_PREFIX = 'bahram_chatbot_phone:';

export function normalizeIranMobile(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    digits = `0${digits}`;
  }
  return digits;
}

/** Strip non-phone characters while typing — digits and Persian/Arabic numerals only. */
export function sanitizePhoneInput(raw: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  let value = '';
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      value += ch;
    } else {
      const p = persian.indexOf(ch);
      if (p >= 0) {
        value += String(p);
        continue;
      }
      const a = arabic.indexOf(ch);
      if (a >= 0) value += String(a);
    }
  }
  return value.slice(0, 11);
}

export function isValidIranMobile(input: string): boolean {
  const digits = normalizeIranMobile(input);
  return /^09\d{9}$/.test(digits);
}

/** Returns a user-facing error while typing, or null when input is empty or still valid-in-progress. */
export function getIranMobileInputError(input: string): string | null {
  const digits = sanitizePhoneInput(input);
  if (!digits) return null;

  if (digits.length > 11) {
    return 'شماره موبایل باید ۱۱ رقم باشد';
  }

  if (digits[0] !== '0') {
    return 'شماره موبایل باید با ۰۹ شروع شود';
  }

  if (digits.length >= 2 && digits[1] !== '9') {
    return 'شماره موبایل باید با ۰۹ شروع شود';
  }

  if (digits.length < 11) {
    return null;
  }

  return /^09\d{9}$/.test(digits) ? null : 'شماره موبایل نامعتبر است';
}

export function phoneSavedKey(sessionId: string): string {
  return `${PHONE_SAVED_PREFIX}${sessionId}`;
}

export function loadSavedChatbotPhone(sessionId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(phoneSavedKey(sessionId))?.trim();
    return value && isValidIranMobile(value) ? normalizeIranMobile(value) : null;
  } catch {
    return null;
  }
}

export function markChatbotPhoneSaved(sessionId: string, phone: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(phoneSavedKey(sessionId), normalizeIranMobile(phone));
  } catch {
    /* ignore */
  }
}
