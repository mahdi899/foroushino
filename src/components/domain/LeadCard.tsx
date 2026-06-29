import { motion } from 'framer-motion'
import { MapPin, Phone, Clock } from 'lucide-react'
import type { Lead } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge, PriorityBadge, SourceChip } from './Badges'
import { formatPhone, relativeDayTime } from '@/lib/format'
import { cn } from '@/lib/cn'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
  onCall?: () => void
  index?: number
}

export function LeadCard({ lead, onClick, onCall, index = 0 }: LeadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      onClick={onClick}
      className="bg-surface rounded-3xl p-4 shadow-card border border-border/60 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start gap-3">
        <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={48} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <SourceChip source={lead.source} size="sm" />
            <PriorityBadge priority={lead.priority} />
          </div>
          <h3 className="truncate text-[15px] font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </h3>
          <p className="mt-0.5 text-[13px] font-bold text-primary-600 tabular-nums">
            {formatPhone(lead.phone)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
            <MapPin size={12} />
            <span className="truncate">{lead.city}</span>
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onCall?.()
          }}
          className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 active:bg-primary-100"
        >
          <Phone size={20} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span
          className={cn(
            'flex items-center gap-1 text-[11px] font-bold',
            lead.nextFollowupAt && new Date(lead.nextFollowupAt).getTime() < Date.now()
              ? 'text-error-500'
              : 'text-neutral-400',
          )}
        >
          {lead.nextFollowupAt && (
            <>
              <Clock size={12} />
              پیگیری: {relativeDayTime(lead.nextFollowupAt)}
            </>
          )}
        </span>
        <ContactStatusBadge temperature={lead.temperature} size="sm" />
      </div>
    </motion.div>
  )
}
