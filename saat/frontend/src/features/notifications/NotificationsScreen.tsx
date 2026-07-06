import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame,
  Clock,
  Award,
  Bell,
  CheckCheck,
  BadgeDollarSign,
  Wallet,
  ShieldAlert,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/ui/States'
import { relativeDayTime } from '@/lib/format'
import type { AppNotification } from '@/types'
import { cn } from '@/lib/cn'

const kindConfig: Record<AppNotification['kind'], { icon: LucideIcon; bg: string; fg: string }> = {
  lead: { icon: Flame, bg: 'bg-hot-50', fg: 'text-hot-600' },
  followup: { icon: Clock, bg: 'bg-warning-50', fg: 'text-warning-600' },
  achievement: { icon: Award, bg: 'bg-secondary-50', fg: 'text-secondary-600' },
  system: { icon: Bell, bg: 'bg-primary-50', fg: 'text-primary-600' },
  sale: { icon: BadgeDollarSign, bg: 'bg-success-50', fg: 'text-success-600' },
  commission: { icon: Wallet, bg: 'bg-success-50', fg: 'text-success-600' },
  payout: { icon: Wallet, bg: 'bg-primary-50', fg: 'text-primary-600' },
  quality: { icon: ShieldAlert, bg: 'bg-error-50', fg: 'text-error-600' },
  shift: { icon: PlayCircle, bg: 'bg-cold-50', fg: 'text-cold-600' },
}

export function NotificationsScreen() {
  const navigate = useNavigate()
  const notifications = useStore((s) => s.notifications)
  const markAllRead = useStore((s) => s.markAllRead)

  useEffect(() => {
    const t = setTimeout(() => markAllRead(), 800)
    return () => clearTimeout(t)
  }, [markAllRead])

  return (
    <Page withNav={false}>
      <TopBar
        title="اعلان‌ها"
        action={
          <button onClick={markAllRead} className="flex h-10 w-10 items-center justify-center text-primary-600">
            <CheckCheck size={20} />
          </button>
        }
      />

      <div className="space-y-2.5 px-4">
        {notifications.length === 0 ? (
          <EmptyState title="اعلانی نداری" description="همه چیز به‌روز است." />
        ) : (
          notifications.map((n) => {
            const { icon: Icon, bg, fg } = kindConfig[n.kind]
            return (
              <button
                key={n.id}
                onClick={() => n.href && navigate(n.href)}
                disabled={!n.href}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl p-3.5 border text-right',
                  n.read ? 'bg-surface border-border/60' : 'bg-primary-50/40 border-primary-100',
                )}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bg, fg)}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-extrabold text-neutral-900">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-neutral-500">{n.body}</p>
                  <p className="mt-1 text-[10px] font-bold text-neutral-300">{relativeDayTime(n.createdAt)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </Page>
  )
}
