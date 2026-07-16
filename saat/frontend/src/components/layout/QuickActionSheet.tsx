import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarPlus,
  CalendarDays,
  PhoneCall,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/cn'
import {
  filterFollowupsForAgent,
  filterLeadsForAgent,
  getNextLead,
  overdueFollowups,
  todayFollowups,
} from '@/lib/leadUtils'
import { toFa } from '@/lib/format'

interface QuickActionSheetProps {
  open: boolean
  onClose: () => void
}

export function QuickActionSheet({ open, onClose }: QuickActionSheetProps) {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)

  const agentFollowups = filterFollowupsForAgent(followups, leads, currentAgentId)
  const overdueCount = overdueFollowups(agentFollowups).length
  const todayCount = todayFollowups(agentFollowups).length
  const callableCount = filterLeadsForAgent(leads, currentAgentId).length

  const actions: { icon: LucideIcon; label: string; desc: string; onClick: () => void; urgent?: boolean }[] = [
    {
      icon: PhoneCall,
      label: 'شروع تماس بعدی',
      desc: 'بهترین مشتری پیشنهادی سیستم',
      onClick: () => {
        const next = getNextLead(leads, followups, currentAgentId)
        onClose()
        if (next) openCallMethodSheet(next)
      },
    },
    ...(overdueCount > 0
      ? [
          {
            icon: AlertTriangle,
            label: 'پیگیری‌های عقب‌افتاده',
            desc: `${toFa(overdueCount)} مورد از موعد گذشته`,
            urgent: true,
            onClick: () => {
              onClose()
              navigate('/followups?bucket=overdue')
            },
          },
        ]
      : []),
    {
      icon: CalendarDays,
      label: 'پیگیری‌های امروز',
      desc: todayCount > 0 ? `${toFa(todayCount)} مورد برای امروز` : 'برنامه تماس امروز',
      onClick: () => {
        onClose()
        navigate('/followups?bucket=today')
      },
    },
    {
      icon: Users,
      label: 'لیست مشتریان',
      desc: `${toFa(callableCount)} مشتری در صف تو`,
      onClick: () => {
        onClose()
        navigate('/leads')
      },
    },
    {
      icon: CalendarPlus,
      label: 'پیگیری جدید',
      desc: 'یادآوری برای خودت بساز',
      onClick: () => {
        onClose()
        navigate('/followups?new=1')
      },
    },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="اقدام سریع">
      <div className="space-y-2 pt-1">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-right active:bg-neutral-50 dark:active:bg-white/[0.04]',
                a.urgent
                  ? 'border-amber-300/70 bg-amber-50/50 dark:border-amber-400/25 dark:bg-amber-400/8'
                  : 'border-border/70',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  a.urgent
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/16 dark:text-amber-300'
                    : 'bg-primary-50 text-primary-600 dark:bg-[#8774E1]/16 dark:text-[#8774E1]',
                )}
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-neutral-900 dark:text-neutral-100">
                  {a.label}
                </p>
                <p className="text-[11px] font-bold text-neutral-400">{a.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
