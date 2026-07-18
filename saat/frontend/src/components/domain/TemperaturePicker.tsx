import { Flame, Snowflake, Sun, Check } from 'lucide-react'
import type { Temperature } from '@/types'
import { temperatureGuide } from '@/data/labels'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const options: Temperature[] = ['hot', 'warm', 'cold']

const config: Record<
  Temperature,
  { icon: typeof Flame; tone: string; actionTone: string; active: string; idle: string }
> = {
  hot: {
    icon: Flame,
    tone: 'text-hot-600 dark:text-hot-400',
    actionTone: 'bg-hot-500/12 text-hot-700 dark:text-hot-300',
    active:
      'border-hot-500/40 bg-hot-500/10 shadow-[0_4px_16px_-10px_rgba(255,107,0,0.35)] dark:border-hot-400/35 dark:bg-hot-400/10',
    idle: 'border-border bg-surface',
  },
  warm: {
    icon: Sun,
    tone: 'text-warm-600 dark:text-warm-400',
    actionTone: 'bg-warm-500/12 text-warm-700 dark:text-warm-300',
    active:
      'border-warm-500/40 bg-warm-500/10 shadow-[0_4px_16px_-10px_rgba(255,176,0,0.3)] dark:border-warm-400/35 dark:bg-warm-400/10',
    idle: 'border-border bg-surface',
  },
  cold: {
    icon: Snowflake,
    tone: 'text-cold-600 dark:text-cold-400',
    actionTone: 'bg-cold-500/10 text-cold-700 dark:text-cold-300',
    active:
      'border-cold-500/35 bg-cold-500/8 shadow-[0_4px_16px_-10px_rgba(82,107,128,0.25)] dark:border-cold-400/30 dark:bg-cold-400/10',
    idle: 'border-border bg-surface',
  },
}

interface TemperaturePickerProps {
  value: Temperature
  onChange: (value: Temperature) => void
}

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[14px] font-bold text-text">وضعیت مشتری بعد از تماس</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
          برای اولویت‌بندی صف تماس و پیگیری، یکی از این سه وضعیت را انتخاب کن.
        </p>
      </div>

      <div className="space-y-2">
        {options.map((temp) => {
          const active = value === temp
          const guide = temperatureGuide[temp]
          const Icon = config[temp].icon

          return (
            <button
              key={temp}
              type="button"
              onClick={() => {
                haptic('selection')
                onChange(temp)
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-[16px] border p-3 text-right transition-colors active:scale-[0.99]',
                active ? config[temp].active : config[temp].idle,
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-soft',
                  config[temp].tone,
                )}
              >
                <Icon size={18} strokeWidth={2.25} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-text">{guide.title}</p>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold',
                        config[temp].actionTone,
                      )}
                    >
                      {guide.action}
                    </span>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3390EC] text-white dark:bg-[#8774E1]">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">{guide.description}</p>
                <p className="mt-1 text-[11px] font-medium text-text-soft">نمونه حرف مشتری: {guide.example}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
