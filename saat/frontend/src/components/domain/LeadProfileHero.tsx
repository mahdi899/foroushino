import { motion } from 'framer-motion'
import { MapPin, Phone } from 'lucide-react'
import type { Lead, Temperature } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge, PriorityBadge, SourceChip } from './Badges'
import { sourceBadgeClass, sourceIcon } from './icons'
import { formatPhone, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

const sourceBadgeTone = sourceBadgeClass

type HeroTheme = {
  glow: string
  avatarRing: string
  avatarShadow: string
  accent: string
  phone: string
  avatarGradient: [string, string]
  onlineDot: string
  probabilityMid: string
}

const heroTheme: Record<Temperature, HeroTheme> = {
  hot: {
    glow: 'bg-hot-400/25',
    avatarRing: 'ring-hot-100',
    avatarShadow: 'shadow-[0_16px_40px_-12px_rgba(255,107,0,0.35)]',
    accent: 'bg-hot-500',
    phone: 'text-hot-600',
    avatarGradient: ['#E5484D', '#FF6B00'],
    onlineDot: 'bg-hot-500',
    probabilityMid: 'bg-warm-100 text-warm-700',
  },
  warm: {
    glow: 'bg-warm-400/20',
    avatarRing: 'ring-warm-100',
    avatarShadow: 'shadow-[0_16px_40px_-12px_rgba(255,176,0,0.3)]',
    accent: 'bg-warm-500',
    phone: 'text-warm-700',
    avatarGradient: ['#FFB000', '#FF6B00'],
    onlineDot: 'bg-warm-500',
    probabilityMid: 'bg-warm-100 text-warm-700',
  },
  cold: {
    glow: 'bg-cold-300/25',
    avatarRing: 'ring-cold-100',
    avatarShadow: 'shadow-[0_16px_40px_-12px_rgba(82,107,128,0.28)]',
    accent: 'bg-cold-500',
    phone: 'text-cold-600',
    avatarGradient: ['#415566', '#8FA8BC'],
    onlineDot: 'bg-cold-400',
    probabilityMid: 'bg-cold-100 text-cold-600',
  },
}

export function LeadProfileHero({ lead }: { lead: Lead }) {
  const theme = heroTheme[lead.temperature]
  const SourceIcon = sourceIcon[lead.source]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="relative overflow-hidden rounded-3xl border border-border/50 bg-surface shadow-card"
    >
      <div className={cn('absolute inset-x-0 top-0 h-1', theme.accent)} />

      <div className="relative px-4 pb-5 pt-7">
        <div
          className={cn(
            'pointer-events-none absolute left-1/2 top-4 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl',
            theme.glow,
          )}
        />

        <div className="relative flex flex-col items-center">
          <div className={cn('relative rounded-full ring-[5px]', theme.avatarRing, theme.avatarShadow)}>
            <Avatar
              id={lead.id}
              first={lead.firstName}
              last={lead.lastName}
              src={lead.avatar}
              size={112}
              online
              ring
              gradient={theme.avatarGradient}
              onlineClassName={theme.onlineDot}
            />
            <span
              className={cn(
                'absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-2xl text-white ring-[3px] ring-surface shadow-md',
                sourceBadgeTone[lead.source],
              )}
            >
              <SourceIcon size={16} strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-[22px] font-extrabold tracking-tight text-neutral-900">
              {lead.firstName} {lead.lastName}
            </h2>
            {lead.priority > 1 && <PriorityBadge priority={lead.priority} />}
          </div>

          {lead.product && (
            <span className="mt-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-extrabold text-neutral-600">
              {lead.product}
            </span>
          )}

          <div className="mt-4 flex w-full items-center justify-center gap-4 rounded-2xl bg-neutral-50 px-4 py-2.5">
            <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-bold', theme.phone)}>
              <Phone size={14} className="shrink-0 opacity-70" />
              <span className="ltr-nums tabular-nums">{formatPhone(lead.phone)}</span>
            </span>
            {lead.city && (
              <>
                <span className="h-4 w-px bg-neutral-200" />
                <span className="inline-flex min-w-0 items-center gap-1 text-[12px] font-bold text-neutral-500">
                  <MapPin size={13} className="shrink-0 opacity-70" />
                  <span className="truncate">{lead.city}</span>
                </span>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <ContactStatusBadge temperature={lead.temperature} />
            <SourceChip source={lead.source} />
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums',
                lead.conversionProbability >= 70
                  ? 'bg-primary-100 text-primary-700'
                  : lead.conversionProbability >= 40
                    ? theme.probabilityMid
                    : lead.temperature === 'cold'
                      ? 'bg-cold-100 text-cold-600'
                      : 'bg-neutral-100 text-neutral-500',
              )}
            >
              {toFa(lead.conversionProbability)}٪ احتمال
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
