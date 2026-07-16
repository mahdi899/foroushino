import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarDays,
  Users,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

interface QueueItem {
  id: string
  label: string
  count: number
  icon: LucideIcon
  path: string
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
      icon: AlertTriangle,
      path: '/followups?bucket=overdue',
      urgent: overdueCount > 0,
    },
    {
      id: 'today',
      label: 'پیگیری امروز',
      count: todayCount,
      icon: CalendarDays,
      path: '/followups?bucket=today',
    },
    {
      id: 'leads',
      label: 'همه مشتریان',
      count: callableCount,
      icon: Users,
      path: '/leads',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
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
            className={cn(
              'relative flex min-w-0 flex-col items-center gap-1.5 rounded-[16px] border px-2 py-3',
              'bg-white/50 transition-colors active:bg-white/70',
              'dark:bg-white/[0.05] dark:active:bg-white/10',
              item.urgent
                ? 'border-amber-400/40 dark:border-amber-400/30'
                : 'border-white/55 dark:border-white/10',
            )}
          >
            {item.urgent && (
              <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
              </span>
            )}
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-[12px]',
                item.urgent
                  ? 'bg-amber-500/14 text-amber-700 dark:bg-amber-400/16 dark:text-amber-300'
                  : 'bg-[#3390EC]/12 dark:bg-[#8774E1]/16',
              )}
            >
              <Icon
                size={17}
                strokeWidth={2.25}
                className={item.urgent ? undefined : TG}
              />
            </span>
            <span className="w-full truncate text-center text-[11px] font-bold text-text">
              {item.label}
            </span>
            <span
              className={cn(
                'text-[13px] font-black tabular-nums leading-none',
                item.urgent ? 'text-amber-700 dark:text-amber-300' : TG,
              )}
            >
              {toFa(item.count)}
            </span>
          </motion.button>
        )
      })}
      {goalComplete && (
        <div className="col-span-3 mt-0.5 flex items-center justify-center gap-1.5 rounded-[12px] bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300">
          <CheckCircle2 size={13} strokeWidth={2.5} />
          هدف امروز تکمیل شد — می‌توانی روی پیگیری‌ها تمرکز کنی
        </div>
      )}
    </div>
  )
}
