/** Open the device SMS app with optional prefilled body. */
export function toSmsUri(phone: string, body?: string): string {
  const digits = phone.replace(/\D/g, '')
  let normalized = digits

  if (normalized.startsWith('98') && normalized.length >= 12) {
    normalized = normalized
  } else if (normalized.startsWith('0')) {
    normalized = `98${normalized.slice(1)}`
  } else if (normalized.startsWith('9') && normalized.length === 10) {
    normalized = `98${normalized}`
  }

  const base = `sms:+${normalized}`
  if (!body?.trim()) return base
  return `${base}?body=${encodeURIComponent(body.trim())}`
}

export function openNativeSms(phone: string, body?: string): void {
  const anchor = document.createElement('a')
  anchor.href = toSmsUri(phone, body)
  anchor.rel = 'noopener'
  anchor.click()
}
