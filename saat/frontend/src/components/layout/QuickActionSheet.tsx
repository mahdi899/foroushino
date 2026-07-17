import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
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
import {
  QUICK_ACTION_ICON_STYLES,
  QuickCallIcon,
  QuickLeadsIcon,
  QuickNewFollowupIcon,
  QuickOverdueIcon,
  QuickTodayIcon,
} from '@/components/layout/QuickActionIcons'
import type { ComponentType } from 'react'

interface QuickActionSheetProps {
  open: boolean
  onClose: () => void
}

type ActionItem = {
  key: string
  icon: ComponentType<{ className?: string }>
  iconStyle: (typeof QUICK_ACTION_ICON_STYLES)[keyof typeof QUICK_ACTION_ICON_STYLES]
  label: string
  desc: string
  onClick: () => void
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

  const actions: ActionItem[] = [
    {
      key: 'next-call',
      icon: QuickCallIcon,
      iconStyle: QUICK_ACTION_ICON_STYLES.call,
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
            key: 'overdue',
            icon: QuickOverdueIcon,
            iconStyle: QUICK_ACTION_ICON_STYLES.overdue,
            label: 'پیگیری‌های عقب‌افتاده',
            desc: `${toFa(overdueCount)} مورد از موعد گذشته`,
            onClick: () => {
              onClose()
              navigate('/followups?bucket=overdue')
            },
          } satisfies ActionItem,
        ]
      : []),
    {
      key: 'today',
      icon: QuickTodayIcon,
      iconStyle: QUICK_ACTION_ICON_STYLES.today,
      label: 'پیگیری‌های امروز',
      desc: todayCount > 0 ? `${toFa(todayCount)} مورد برای امروز` : 'برنامه تماس امروز',
      onClick: () => {
        onClose()
        navigate('/followups?bucket=today')
      },
    },
    {
      key: 'leads',
      icon: QuickLeadsIcon,
      iconStyle: QUICK_ACTION_ICON_STYLES.leads,
      label: 'لیست مشتریان',
      desc: `${toFa(callableCount)} مشتری در صف تو`,
      onClick: () => {
        onClose()
        navigate('/leads')
      },
    },
    {
      key: 'new-followup',
      icon: QuickNewFollowupIcon,
      iconStyle: QUICK_ACTION_ICON_STYLES.newFollowup,
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
      <div className="ios-inset-group">
        {actions.map((action, index) => {
          const Icon = action.icon
          const isLast = index === actions.length - 1

          return (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className={cn('ios-list-row', !isLast && 'ios-list-row-divider')}
            >
              <span className={cn('ios-action-icon', action.iconStyle)}>
                <Icon />
              </span>

              <span className="min-w-0 flex-1 text-right">
                <span className="block text-[17px] leading-[22px] text-text">{action.label}</span>
                <span className="block text-[13px] leading-[18px] text-text-muted">{action.desc}</span>
              </span>

              <ChevronLeft
                size={17}
                strokeWidth={2.2}
                className="shrink-0 text-[#C7C7CC] dark:text-[#636366]"
                aria-hidden
              />
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
