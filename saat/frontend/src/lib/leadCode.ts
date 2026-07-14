import type { Lead } from '@/types'
import { toFa } from './format'

export function leadDisplayCode(lead: Pick<Lead, 'id' | 'displayCode'>): string {
  const raw = lead.displayCode ?? lead.id.replace(/\D/g, '')
  if (/^\d+$/.test(raw)) {
    return toFa(raw.padStart(4, '0'))
  }

  const digits = lead.id.replace(/\D/g, '')
  if (digits) {
    return toFa(String(parseInt(digits, 10)).padStart(4, '0'))
  }

  return toFa(raw)
}
