import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCheck, ChevronLeft } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/ui/States'
import { NOTIFICATION_ICON_STYLES } from '@/components/domain/NotificationIcons'
import { relativeDayTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const listMotion = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
}

const rowMotion = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
  },
}

export function NotificationsScreen() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
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
          notifications.length > 0 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={markAllRead}
              aria-label="علامت‌گذاری همه به‌عنوان خوانده‌شده"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-primary-600 transition-colors active:bg-black/[0.07] dark:bg-white/[0.08] dark:text-primary-400"
            >
              <CheckCheck size={18} strokeWidth={2.25} />
            </motion.button>
          ) : null
        }
      />

      <div className="px-4 pb-6 pt-1">
        {notifications.length === 0 ? (
          <EmptyState title="اعلانی نداری" description="همه چیز به‌روز است." />
        ) : (
          <motion.div
            className="ios-inset-group divide-y divide-black/[0.06] dark:divide-white/[0.08]"
            variants={reduceMotion ? undefined : listMotion}
            initial={reduceMotion ? false : 'hidden'}
            animate={reduceMotion ? undefined : 'show'}
          >
            {notifications.map((n) => {
              const { icon: Icon, tone } = NOTIFICATION_ICON_STYLES[n.kind]
              const clickable = !!n.href

              return (
                <motion.button
                  key={n.id}
                  type="button"
                  variants={reduceMotion ? undefined : rowMotion}
                  whileTap={clickable ? { scale: 0.985 } : undefined}
                  onClick={() => n.href && navigate(n.href)}
                  disabled={!clickable}
                  className={cn(
                    'ios-list-row relative w-full text-right transition-colors',
                    !n.read && 'bg-primary-500/[0.05] dark:bg-primary-400/[0.07]',
                    !clickable && 'cursor-default',
                  )}
                >
                  {!n.read ? (
                    <motion.span
                      aria-hidden
                      className="absolute -left-0.5 top-3 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-[#2C2C2E]"
                      animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [1, 0.75, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ) : null}

                  <motion.span
                    className={cn('ios-action-icon', tone)}
                    animate={
                      reduceMotion || n.read
                        ? undefined
                        : { scale: [1, 1.06, 1] }
                    }
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Icon />
                  </motion.span>

                  <span className="min-w-0 flex-1 pr-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'block text-[15px] leading-[20px]',
                          n.read ? 'font-semibold text-text' : 'font-bold text-text',
                        )}
                      >
                        {n.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-[13px] leading-[18px] text-text-muted">
                      {n.body}
                    </span>
                    <span className="mt-1.5 block text-[11px] font-medium text-text-soft">
                      {relativeDayTime(n.createdAt)}
                    </span>
                  </span>

                  {clickable ? (
                    <ChevronLeft
                      size={16}
                      strokeWidth={2.2}
                      className="shrink-0 self-center text-[#C7C7CC] dark:text-[#636366]"
                      aria-hidden
                    />
                  ) : null}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </div>
    </Page>
  )
}
