import { motion } from 'framer-motion'
import { Phone, Clock, Target, NotebookPen, ChevronDown } from 'lucide-react'
import type { Lead } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge, SourceChip } from './Badges'
import { formatPhone } from '@/lib/format'
import { toFa } from '@/lib/format'

interface NextCallCardProps {
  lead: Lead
  onCall: () => void
  onDetails: () => void
}

export function NextCallCard({ lead, onCall, onDetails }: NextCallCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 240 }}
      className="rounded-[28px] bg-surface p-5 shadow-card border border-border/60"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-neutral-400">
          <Target size={15} className="text-primary-500" />
          سرنخ بعدی
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <ContactStatusBadge temperature={lead.temperature} />
            <span className="text-sm font-bold text-primary-600 tabular-nums">
              {formatPhone(lead.phone)}
            </span>
          </div>
        </div>
        <Avatar first={lead.firstName} last={lead.lastName} src={lead.avatar} size={64} online ring />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-neutral-50 p-3">
        <Stat
          icon={<Clock size={15} className="text-neutral-400" />}
          label="بهترین زمان"
          value={lead.bestCallTime}
        />
        <div className="flex flex-col items-center justify-center border-x border-border/70">
          <div className="relative flex h-11 w-11 items-center justify-center">
            <svg className="absolute -rotate-90" width={44} height={44}>
              <circle cx={22} cy={22} r={18} fill="none" stroke="#eef1f4" strokeWidth={5} />
              <circle
                cx={22}
                cy={22}
                r={18}
                fill="none"
                stroke="#10b981"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={2 * Math.PI * 18 * (1 - lead.conversionProbability / 100)}
              />
            </svg>
            <span className="text-[11px] font-extrabold text-neutral-800 tabular-nums">
              {toFa(lead.conversionProbability)}
            </span>
          </div>
          <span className="mt-1 text-[10px] font-bold text-neutral-400">احتمال موفقیت</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1">
          <SourceChip source={lead.source} size="sm" />
          <span className="text-[10px] font-bold text-neutral-400">منبع سرنخ</span>
        </div>
      </div>

      {lead.interestReason && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-border/70 p-3">
          <NotebookPen size={15} className="mt-0.5 shrink-0 text-primary-500" />
          <div>
            <p className="text-[11px] font-bold text-neutral-400">یادداشت سریع</p>
            <p className="mt-0.5 text-[13px] leading-6 text-neutral-700 line-clamp-2">
              {lead.interestReason}
            </p>
          </div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCall}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-primary-700 to-primary-500 text-base font-extrabold text-white shadow-float"
      >
        <Phone size={20} />
        تماس بگیر
      </motion.button>

      <button
        onClick={onDetails}
        className="mx-auto mt-2 flex items-center justify-center p-1 text-neutral-300"
      >
        <ChevronDown size={20} />
      </button>
    </motion.div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 text-center">
      {icon}
      <span className="text-[11px] font-extrabold text-neutral-800 leading-4">{value}</span>
      <span className="text-[10px] font-bold text-neutral-400">{label}</span>
    </div>
  )
}
