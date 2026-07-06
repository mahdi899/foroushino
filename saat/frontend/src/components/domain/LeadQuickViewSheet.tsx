import { useNavigate } from 'react-router-dom'
import {
  Phone,
  MapPin,
  Clock,
  NotebookPen,
  MessageSquareWarning,
  AlertCircle,
  History,
  TrendingUp,
  ChevronLeft,
  Lock,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge, SourceChip, LeadStatusBadge } from './Badges'
import { objectionLabels, stageLabels } from '@/data/labels'
import { formatPhone, maskPhone, relativeDayTime, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { MY_AGENT_ID } from '@/data/mock'
import type { Lead } from '@/types'

export function LeadQuickViewSheet({
  lead,
  open,
  onClose,
  onCall,
}: {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onCall: (lead: Lead) => void
}) {
  const navigate = useNavigate()
  const agents = useStore((s) => s.agents)
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)
  if (!lead) return null

  const lockedByOther = lead.lockedBy && lead.lockedBy !== MY_AGENT_ID
  const lockedByAgent = lockedByOther ? agents.find((a) => a.id === lead.lockedBy) : null

  return (
    <BottomSheet open={open} onClose={onClose} title="پیش‌نمایش سریع">
      <div className="space-y-4 pb-1 pt-1">
        <div className="flex items-center gap-3">
          <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={52} ring />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-extrabold text-neutral-900">
              {lead.firstName} {lead.lastName}
            </p>
            <p className="ltr-nums truncate text-[12px] font-bold text-primary-600">
              {maskPhoneNumbers ? maskPhone(lead.phone) : formatPhone(lead.phone)}
            </p>
          </div>
          {lead.status && <LeadStatusBadge status={lead.status} size="sm" />}
        </div>

        {lockedByOther && (
          <div className="flex items-center gap-2 rounded-2xl bg-error-50 px-3.5 py-2.5 text-[12px] font-extrabold text-error-600">
            <Lock size={14} />
            {lockedByAgent ? `قفل توسط ${lockedByAgent.firstName} ${lockedByAgent.lastName}` : 'قفل شده توسط نیروی دیگر'}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ContactStatusBadge temperature={lead.temperature} size="sm" />
          <SourceChip source={lead.source} size="sm" />
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700">
            <TrendingUp size={11} className="-mt-0.5 ml-1 inline" />
            {toFa(lead.conversionProbability)}٪ احتمال
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-extrabold text-neutral-600">
            {stageLabels[lead.stage]}
          </span>
        </div>

        {lead.city && (
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-500">
            <MapPin size={13} className="shrink-0 text-neutral-400" />
            {lead.city}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <QuickField icon={Clock} label="بهترین زمان تماس" value={lead.bestCallTime || '-'} />
          <QuickField icon={History} label="تعداد تلاش" value={toFa(lead.callCount)} />
        </div>

        {lead.painPoint && (
          <QuickField icon={AlertCircle} label="نیاز اصلی مشتری" value={lead.painPoint} tone="warning" full />
        )}
        {lead.objection && (
          <QuickField
            icon={MessageSquareWarning}
            label="اعتراض احتمالی"
            value={objectionLabels[lead.objection]}
            tone="error"
            full
          />
        )}
        {lead.lastNote && (
          <QuickField icon={NotebookPen} label="آخرین یادداشت" value={lead.lastNote} full />
        )}
        {lead.lastCallAt && (
          <p className="text-[11px] font-bold text-neutral-400">آخرین تماس: {relativeDayTime(lead.lastCallAt)}</p>
        )}

        <div className="flex gap-2.5 pt-1">
          <Button
            variant="soft"
            size="lg"
            className="flex-1"
            icon={<ChevronLeft size={17} />}
            onClick={() => {
              onClose()
              navigate(`/leads/${lead.id}`)
            }}
          >
            جزئیات کامل
          </Button>
          <Button
            size="lg"
            className="flex-[1.3]"
            disabled={!!lockedByOther}
            icon={<Phone size={17} />}
            onClick={() => {
              haptic('medium')
              onClose()
              onCall(lead)
            }}
          >
            تماس بگیر
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

function QuickField({
  icon: Icon,
  label,
  value,
  tone = 'primary',
  full,
}: {
  icon: typeof Clock
  label: string
  value: string
  tone?: 'primary' | 'warning' | 'error'
  full?: boolean
}) {
  const toneClass = {
    primary: 'text-primary-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  }[tone]
  return (
    <div className={`rounded-xl bg-neutral-50 px-3 py-2 ${full ? 'col-span-2' : ''}`}>
      <p className={`mb-0.5 flex items-center gap-1 text-[10px] font-bold text-neutral-400`}>
        <Icon size={11} className={toneClass} />
        {label}
      </p>
      <p className="text-[12px] font-extrabold leading-5 text-neutral-800">{value}</p>
    </div>
  )
}
