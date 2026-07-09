/**
 * Call routing — native SIM dialer vs in-app VoIP.
 * Flip `VOIP_CALL_ENABLED` (or VITE_VOIP_CALL_ENABLED) when VoIP backend is ready.
 */
export const VOIP_CALL_ENABLED =
  import.meta.env.VITE_VOIP_CALL_ENABLED === 'true' || false

export type CallMethod = 'native' | 'voip'

/** Normalize Iranian mobile numbers for tel: URIs. */
export function toTelUri(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('98') && digits.length >= 12) return `tel:+${digits}`
  if (digits.startsWith('0')) return `tel:${digits}`
  if (digits.startsWith('9') && digits.length === 10) return `tel:0${digits}`
  return `tel:${digits}`
}

/** Open the device phone app with the lead number (SIM / native dialer). */
export function dialNativePhone(phone: string): void {
  const uri = toTelUri(phone)
  const anchor = document.createElement('a')
  anchor.href = uri
  anchor.rel = 'noopener'
  anchor.click()
}

export function isVoipCallEnabled(): boolean {
  return VOIP_CALL_ENABLED
}
