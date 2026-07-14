import { motion } from 'framer-motion'
import { MapPin, Phone } from 'lucide-react'
import type { Lead, Temperature } from '@/types'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { ContactStatusBadge, PriorityBadge, SourceChip } from './Badges'
import { sourceBadgeClass, sourceIcon } from './icons'
import { formatPhone, maskPhone, toFa } from '@/lib/format'
import { useStore } from '@/store/useStore'
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
    glow: 'bg-hot-400/20',
    avatarRing: 'ring-hot-200/60',
    avatarShadow: 'shadow-[0_16px_40px_-12px_rgba(255,107,0,0.35)]',
    accent: 'from-hot-500/80 to-hot-400/40',
    phone: 'text-hot-600',
    avatarGradient: ['#E5484D', '#FF6B00'],
    onlineDot: 'bg-hot-500',
    probabilityMid: 'border-warm-200/50 bg-warm-500/10 text-warm-700',
  },
  warm: {
    glow: 'bg-warm-400/18',
    avatarRing: 'ring-warm-200/60',
    avatarShadow: 'shadow-[0_16px_40px_-12px_rgba(255,176,0,0.3)]',
    accent: 'from-warm-500/80 to-warm-400/40',
    phone: 'text-warm-700',
    avatarGradient: ['#FFB000', '#FF6B00'],
    onlineDot: 'bg-warm-500',
    probabilityMid: 'border-warm-200/50 bg-warm-500/10 text-warm-700',
  },
  cold: {
    glow: 'bg-cold-300/20',
    avatarRing: 'ring-cold-200/60',
    avatarShadow: 'shadow-[0_16px_40px_-12px_rgba(82,107,128,0.28)]',
    accent: 'from-cold-500/70 to-cold-400/35',
    phone: 'text-cold-600',
    avatarGradient: ['#415566', '#8FA8BC'],
    onlineDot: 'bg-cold-400',
    probabilityMid: 'border-cold-200/50 bg-cold-500/10 text-cold-600',
  },
}

export function LeadProfileHero({ lead }: { lead: Lead }) {
  const theme = heroTheme[lead.temperature]
  const SourceIcon = sourceIcon[lead.source]
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="glass-card relative overflow-hidden rounded-[26px] border border-white/55 dark:border-white/10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={cn('absolute -left-8 top-4 h-32 w-32 rounded-full blur-3xl', theme.glow)} />
        <div className="absolute -bottom-8 -right-6 h-28 w-28 rounded-full bg-[#3390EC]/10 blur-3xl" />
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/15" />
      </div>

      <div className={cn('h-1 w-full bg-gradient-to-l', theme.accent)} />

      <div className="relative px-4 pb-5 pt-6">
        <div className="relative flex flex-col items-center">
          <div className={cn('relative rounded-full ring-[4px]', theme.avatarRing, theme.avatarShadow)}>
            <LeadAvatar
              lead={lead}
              size={112}
              online
              ring
              onlineClassName={theme.onlineDot}
            />
            <span
              className={cn(
                'glass-inset absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-md ring-2 ring-white/80',
                sourceBadgeTone[lead.source],
              )}
            >
              <SourceIcon size={16} strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-[22px] font-bold tracking-tight text-neutral-900 dark:text-white">
              {lead.firstName} {lead.lastName}
            </h2>
            {lead.priority > 1 && <PriorityBadge priority={lead.priority} />}
          </div>

          {lead.product && (
            <span className="glass-inset mt-1.5 rounded-full border border-white/50 px-3 py-1 text-[11px] font-bold text-neutral-600 dark:border-white/10 dark:text-neutral-300">
              {lead.product}
            </span>
          )}

          <div className="glass-inset mt-4 flex w-full items-center justify-center gap-4 rounded-2xl border border-white/50 px-4 py-2.5 dark:border-white/10">
            <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold', theme.phone)}>
              <Phone size={14} className="shrink-0 opacity-70" strokeWidth={2.25} />
              <span className="ltr-nums tabular-nums">
                {maskPhoneNumbers ? maskPhone(lead.phone) : formatPhone(lead.phone)}
              </span>
            </span>
            {lead.city && (
              <>
                <span className="h-4 w-px bg-white/40 dark:bg-white/10" />
                <span className="inline-flex min-w-0 items-center gap-1 text-[12px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                  <MapPin size={13} className="shrink-0 opacity-70" strokeWidth={2.25} />
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
                'glass-inset rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums',
                lead.conversionProbability >= 70
                  ? 'border-primary-200/50 bg-primary-500/10 text-primary-700'
                  : lead.conversionProbability >= 40
                    ? theme.probabilityMid
                    : lead.temperature === 'cold'
                      ? 'border-cold-200/50 bg-cold-500/10 text-cold-600'
                      : 'border-white/50 text-neutral-500 dark:border-white/10',
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
