import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlarmClock,
  CalendarCheck2,
  UsersRound,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { BRAND_TEXT } from '@/lib/brand'
import { cn } from '@/lib/cn'

const TG = BRAND_TEXT

interface QueueItem {
  id: string
  label: string
  count: number
  icon: LucideIcon
  path: string
  iconTone: 'icon-3d-warning' | 'icon-3d-primary' | 'icon-3d-success'
  urgent?: boolean
}

interface AgentWorkQueueProps {
  todayCount: number
  overdueCount: number
  callableCount: number
  goalComplete?: boolean
}

export function AgentWorkQueue({
  todayCount,
  overdueCount,
  callableCount,
  goalComplete = false,
}: AgentWorkQueueProps) {
  const navigate = useNavigate()

  const items: QueueItem[] = [
    {
      id: 'overdue',
      label: 'عقب‌افتاده',
      count: overdueCount,
      icon: AlarmClock,
      path: '/followups?bucket=overdue',
      iconTone: 'icon-3d-warning',
      urgent: overdueCount > 0,
    },
    {
      id: 'today',
      label: 'پیگیری امروز',
      count: todayCount,
      icon: CalendarCheck2,
      path: '/followups?bucket=today',
      iconTone: 'icon-3d-primary',
    },
    {
      id: 'leads',
      label: 'همه مشتریان',
      count: callableCount,
      icon: UsersRound,
      path: '/leads',
      iconTone: 'icon-3d-success',
    },
  ]

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 divide-x divide-white/45 dark:divide-white/8">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                haptic('selection')
                navigate(item.path)
              }}
              className="group relative flex min-w-0 flex-col items-center gap-2 px-2 py-3.5 transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.04]"
            >
              <span
                className={cn(
                  'icon-3d flex h-11 w-11 items-center justify-center rounded-[14px] transition-transform group-active:scale-95',
                  item.iconTone,
                )}
              >
                <Icon size={20} strokeWidth={2.25} className="text-white" />
              </span>
              <span className="w-full truncate text-center text-[11px] font-semibold text-text-soft">
                {item.label}
              </span>
              <span
                className={cn(
                  'text-[20px] font-black tabular-nums leading-none tracking-tight',
                  item.urgent ? 'text-amber-600 dark:text-amber-400' : TG,
                )}
              >
                {toFa(item.count)}
              </span>
            </motion.button>
          )
        })}
      </div>

      {goalComplete && (
        <div className="flex items-center justify-center gap-1.5 rounded-[14px] bg-emerald-500/10 px-3 py-2.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300">
          <CheckCircle2 size={14} strokeWidth={2.35} />
          هدف امروز تکمیل شد — روی پیگیری‌ها تمرکز کن
        </div>
      )}
    </div>
  )
}
