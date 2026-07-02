import { useState } from 'react'
import {
  Bell,
  Moon,
  Vibrate,
  Globe,
  Trash2,
  WifiOff,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { OfflineState } from '@/components/ui/States'
import { roleLabels } from '@/data/labels'
import { Chip } from '@/components/ui/Chip'
import type { Role } from '@/types'
import { cn } from '@/lib/cn'

const roles: Role[] = ['agent', 'leader', 'supervisor', 'manager']

export function SettingsScreen() {
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)
  const pushToast = useStore((s) => s.pushToast)
  const [offline, setOffline] = useState(false)
  const [toggles, setToggles] = useState({ notif: true, haptic: true, dark: false })

  if (offline) {
    return (
      <Page withNav={false}>
        <TopBar title="حالت آفلاین" onBack={() => setOffline(false)} />
        <OfflineState
          title="اتصال اینترنت قطع است"
          description="این یک نمایش از حالت آفلاین است. وقتی اتصال برقرار شود داده‌ها همگام می‌شوند."
          action={{ label: 'تلاش دوباره', onClick: () => setOffline(false) }}
        />
      </Page>
    )
  }

  const switches: { icon: LucideIcon; label: string; key: keyof typeof toggles }[] = [
    { icon: Bell, label: 'اعلان‌ها', key: 'notif' },
    { icon: Vibrate, label: 'لرزش لمسی', key: 'haptic' },
    { icon: Moon, label: 'حالت تیره', key: 'dark' },
  ]

  return (
    <Page withNav={false}>
      <TopBar title="تنظیمات" />

      <div className="space-y-5 px-4">
        <Section title="نقش (حالت دمو)">
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <Chip key={r} active={role === r} onClick={() => { setRole(r); pushToast(`نقش: ${roleLabels[r]}`) }}>
                {roleLabels[r]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="عمومی">
          <div className="overflow-hidden rounded-2xl">
            {switches.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  'flex items-center gap-3 py-3',
                  i < switches.length - 1 && 'border-b border-border/60',
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                  <s.icon size={18} />
                </span>
                <span className="flex-1 text-[14px] font-bold text-neutral-800">{s.label}</span>
                <Toggle
                  on={toggles[s.key]}
                  onToggle={() => {
                    setToggles((t) => {
                      const next = { ...t, [s.key]: !t[s.key] }
                      if (s.key === 'dark') {
                        document.documentElement.setAttribute(
                          'data-theme',
                          next.dark ? 'dark' : 'light',
                        )
                      }
                      return next
                    })
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="زبان">
          <button className="flex w-full items-center gap-3 py-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <Globe size={18} />
            </span>
            <span className="flex-1 text-right text-[14px] font-bold text-neutral-800">زبان</span>
            <span className="text-[13px] font-bold text-neutral-400">فارسی</span>
            <ChevronLeft size={18} className="text-neutral-300" />
          </button>
        </Section>

        <Section title="پیشرفته">
          <button
            onClick={() => setOffline(true)}
            className="flex w-full items-center gap-3 py-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <WifiOff size={18} />
            </span>
            <span className="flex-1 text-right text-[14px] font-bold text-neutral-800">
              نمایش حالت آفلاین
            </span>
            <ChevronLeft size={18} className="text-neutral-300" />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('saat-store')
              location.reload()
            }}
            className="mt-1 flex w-full items-center gap-3 py-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-error-50 text-error-600">
              <Trash2 size={18} />
            </span>
            <span className="flex-1 text-right text-[14px] font-bold text-error-600">
              بازنشانی داده‌های دمو
            </span>
            <ChevronLeft size={18} className="text-neutral-300" />
          </button>
        </Section>

        <p className="text-center text-[11px] font-bold text-neutral-300">سات · نسخه ۱.۰.۰</p>
      </div>
    </Page>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-[13px] font-extrabold text-neutral-500">{title}</h2>
      <div className="rounded-2xl bg-surface p-3 shadow-card border border-border/60">{children}</div>
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative h-7 w-12 rounded-full transition-colors',
        on ? 'bg-primary-500' : 'bg-neutral-200',
      )}
    >
      <span
        className={cn(
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
          on ? 'right-1' : 'right-6',
        )}
      />
    </button>
  )
}
