import type { Temperature } from '@/types'

export function isStockAvatarUrl(src?: string | null): boolean {
  if (!src) return false
  return /\/avatars\/ir-\d+\.jpe?g$/i.test(src) || src.includes('/avatars/ir-')
}

export function resolveLeadPhoto(src?: string | null): string | null {
  if (!src || isStockAvatarUrl(src)) return null
  return src
}

export const leadAvatarTheme: Record<
  Temperature,
  { bg: string; icon: string; ring: string; badge: string; glow: string }
> = {
  hot: {
    bg: 'bg-gradient-to-br from-hot-500/24 via-orange-500/14 to-hot-400/10',
    icon: 'text-hot-600 dark:text-hot-400',
    ring: 'ring-hot-200/55 dark:ring-hot-500/30',
    badge: 'bg-hot-500 text-white shadow-[0_0_10px_rgba(255,107,0,0.35)]',
    glow: 'bg-hot-500/30',
  },
  warm: {
    bg: 'bg-gradient-to-br from-warm-400/22 via-amber-400/14 to-warm-500/10',
    icon: 'text-warm-700 dark:text-warm-400',
    ring: 'ring-warm-200/55 dark:ring-warm-500/25',
    badge: 'bg-warm-500 text-white shadow-[0_0_10px_rgba(255,176,0,0.28)]',
    glow: 'bg-warm-500/24',
  },
  cold: {
    bg: 'bg-gradient-to-br from-cold-400/18 via-slate-400/12 to-cold-500/10',
    icon: 'text-cold-600 dark:text-cold-300',
    ring: 'ring-cold-200/55 dark:ring-cold-500/25',
    badge: 'bg-cold-500 text-white shadow-[0_0_10px_rgba(82,107,128,0.28)]',
    glow: 'bg-cold-500/20',
  },
}
