import { capabilitiesFromSettings, isNativeAvailable, isVoipAvailable } from '@/lib/telephony'
import { useStore } from '@/store/useStore'

/** Runtime VoIP gate — admin toggle + health from app settings sync. */
export function isVoipCallEnabled(): boolean {
  const settings = useStore.getState().appSettings
  return isVoipAvailable(capabilitiesFromSettings(settings))
}

export function isNativeCallEnabled(): boolean {
  const settings = useStore.getState().appSettings
  return isNativeAvailable(capabilitiesFromSettings(settings))
}

export type CallMethod = 'native' | 'voip'

/** @deprecated env flag — prefer isVoipCallEnabled() from app settings */
export const VOIP_CALL_ENABLED =
  import.meta.env.VITE_VOIP_CALL_ENABLED === 'true' || false

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
