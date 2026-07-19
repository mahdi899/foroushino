import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  Clock,
  ChevronLeft,
  SkipForward,
  Repeat2,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react'
import type { Lead, SuggestReason } from '@/types'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { ProductLink, resolveProductFromStore } from '@/components/domain/ProductLink'
import { ContactStatusBadge } from './Badges'
import { LeadStatusSheet } from './LeadStatusSheet'
import { resolveSourceIcon, resolveSourceIconClass, suggestReasonIcon, suggestReasonChipLabel } from './icons'
import { suggestReasonActionHint } from '@/data/labels'
import { getSourceLabel } from '@/lib/leadSources'
import { formatCustomerPhone } from '@/lib/phonePrivacy'
import { toFa } from '@/lib/format'
import { leadDisplayCode } from '@/lib/leadCode'
import { useStore } from '@/store/useStore'
import { haptic } from '@/lib/telegram'
import { BRAND_CTA, BRAND_SOFT, BRAND_TEXT } from '@/lib/brand'
import { cn } from '@/lib/cn'

const TG = BRAND_TEXT

const reasonBannerStyle: Partial<Record<SuggestReason, string>> = {
  overdue_follow_up:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200',
  hot_in_window:
    'border-orange-500/30 bg-orange-500/10 text-orange-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-200',
  today_follow_up: BRAND_SOFT,
}

interface NextCallCardProps {
  lead: Lead
  reason?: SuggestReason
  onCall: () => void
  onDetails?: () => void
  onSkip?: () => void
  canSkip?: boolean
}

export function NextCallCard({ lead, reason, onCall, onDetails, onSkip, canSkip = false }: NextCallCardProps) {
  const navigate = useNavigate()
  const [statusOpen, setStatusOpen] = useState(false)
  const leadSources = useStore((s) => s.leadSources)
  const products = useStore((s) => s.products)
  const SourceIcon = resolveSourceIcon(lead.source)
  const ReasonIcon = reason ? suggestReasonIcon[reason] : null
  const role = useStore((s) => s.role)
  const prob = Math.max(0, Math.min(100, lead.conversionProbability))
  const leadProduct = useMemo(
    () => resolveProductFromStore(products, { productId: lead.productId, name: lead.product }),
    [products, lead.productId, lead.product],
  )

  const secondaryActions: { id: string; label: string; icon: LucideIcon; onClick: () => void }[] = [
    {
      id: 'details',
      label: 'جزئیات',
      icon: ChevronLeft,
      onClick: () => {
        haptic('light')
        if (onDetails) onDetails()
        else navigate(`/leads/${lead.id}`)
      },
    },
    ...(canSkip && onSkip
      ? [
          {
            id: 'skip',
            label: 'رد کردن',
            icon: SkipForward,
            onClick: () => {
              haptic('selection')
              onSkip()
            },
          },
        ]
      : []),
    {
      id: 'status',
      label: 'وضعیت',
      icon: Repeat2,
      onClick: () => {
        haptic('light')
        setStatusOpen(true)
      },
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="glass-card overflow-hidden rounded-[22px] border border-white/55 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] dark:border-white/10 dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)]"
    >
      {/* Why now — coaching banner */}
      {reason && ReasonIcon && (
        <div
          className={cn(
            'flex items-start gap-3 border-b px-4 py-3.5',
            reasonBannerStyle[reason] ?? BRAND_SOFT,
          )}
        >
          <span className="icon-3d icon-3d-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]">
            <ReasonIcon size={17} strokeWidth={2.35} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug">{suggestReasonChipLabel[reason]}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-85">
              {suggestReasonActionHint[reason]}
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Lead identity */}
        <div className="flex items-center gap-3">
          <LeadAvatar lead={lead} size={52} ring showTempBadge animated />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[20px] font-bold leading-tight tracking-tight text-text">
              {lead.firstName} {lead.lastName}
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-text-soft">
              کد مشتری{' '}
              <span dir="ltr" className="font-bold tracking-wide text-text tabular-nums">
                {leadDisplayCode(lead)}
              </span>
            </p>
            {lead.product ? (
              <ProductLink
                product={leadProduct}
                productId={lead.productId}
                className={cn(
                  'mt-0.5 block min-w-0 text-right text-[14px] font-bold leading-snug',
                  leadProduct?.slug ? TG : 'text-text-soft',
                )}
              >
                {lead.product}
              </ProductLink>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <ContactStatusBadge temperature={lead.temperature} size="sm" />
              <span className="text-[11px] font-semibold tabular-nums text-text-soft">
                {toFa(prob)}٪ احتمال
              </span>
            </div>
          </div>
        </div>

        {/* Context row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-[11px] font-semibold tabular-nums dark:border-white/10 dark:bg-white/[0.06]"
          >
            <span className="icon-3d icon-3d-primary flex h-5 w-5 items-center justify-center rounded-[6px]">
              <Phone size={10} strokeWidth={2.5} className="text-white" />
            </span>
            <span className="text-text">{formatCustomerPhone(lead.phone, role)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:border-white/10 dark:bg-white/[0.06]">
            <Clock size={11} className={TG} strokeWidth={2.25} />
            {lead.bestCallTime}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-[11px] font-semibold text-text-muted dark:border-white/10 dark:bg-white/[0.06]">
            <SourceIcon size={11} className={resolveSourceIconClass(lead.source)} strokeWidth={2.25} />
            {getSourceLabel(lead.source, leadSources)}
          </span>
        </div>

        {lead.interestReason && (
          <div className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
            <NotebookPen size={14} className={cn('mt-0.5 shrink-0', TG)} strokeWidth={2.25} />
            <p className="text-[12px] leading-[1.55] text-text-muted line-clamp-2">{lead.interestReason}</p>
          </div>
        )}

        {/* Primary CTA */}
        <motion.button
          type="button"
          onClick={onCall}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'mt-4 flex h-[54px] w-full items-center justify-center gap-2.5',
            'rounded-[16px] text-[17px] font-bold',
            BRAND_CTA,
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Phone size={18} strokeWidth={2.5} className="text-white" />
          </span>
          تماس بگیر
        </motion.button>

        {/* Secondary actions — compact text row */}
        <div className="mt-2.5 flex items-center justify-center divide-x divide-white/40 dark:divide-white/10">
          {secondaryActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="inline-flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] font-semibold text-text-muted transition-colors active:bg-black/[0.04] dark:active:bg-white/[0.06]"
              >
                <Icon size={14} strokeWidth={2.25} />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>

      <LeadStatusSheet lead={lead} open={statusOpen} onClose={() => setStatusOpen(false)} />
    </motion.div>
  )
}
