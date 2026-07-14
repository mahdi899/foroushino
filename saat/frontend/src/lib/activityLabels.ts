import { resultLabels } from '@/data/labels'
import type { CallResult } from '@/types'

export function localizeCallResultCode(code: string): string {
  const normalized = code.trim()
  if (normalized in resultLabels) {
    return resultLabels[normalized as CallResult]
  }

  return normalized
}

export function localizeActivityTitle(title: string): string {
  const prefixes = ['ثبت نتیجه تماس:', 'نتیجه تماس:'] as const

  for (const prefix of prefixes) {
    if (title.startsWith(prefix)) {
      const code = title.slice(prefix.length).trim()
      return `${prefix} ${localizeCallResultCode(code)}`
    }
  }

  return title
}

export function localizeStatusNote(note: string): string {
  return localizeActivityTitle(note)
}
