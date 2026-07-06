/** Client-side captcha trust — skip UI for 24h after a successful verification. */
const STORAGE_KEY = 'bahram_captcha_trust';
const TRUST_MS = 24 * 60 * 60 * 1000;

export function isCaptchaTrusted(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const expires = Number(raw);
  if (!Number.isFinite(expires) || Date.now() >= expires) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
  return true;
}

export function markCaptchaTrusted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(Date.now() + TRUST_MS));
}

export function clearCaptchaTrust(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
