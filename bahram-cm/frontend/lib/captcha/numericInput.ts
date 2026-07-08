/** Digits only (ASCII + Persian/Arabic numerals) for math captcha answers. */
export function sanitizeNumericInput(raw: string, maxLen = 8): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  let value = '';
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      value += ch;
      continue;
    }
    const p = persian.indexOf(ch);
    if (p >= 0) {
      value += String(p);
      continue;
    }
    const a = arabic.indexOf(ch);
    if (a >= 0) value += String(a);
  }
  return value.slice(0, maxLen);
}

export function isNumericInputKey(key: string): boolean {
  if (key.length !== 1) return false;
  return /^[0-9۰-۹٠-٩]$/.test(key);
}
