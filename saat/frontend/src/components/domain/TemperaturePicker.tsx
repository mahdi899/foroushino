import { motion } from 'framer-motion'
import { Flame, Snowflake, Sun, Check } from 'lucide-react'
import type { Temperature } from '@/types'
import { temperatureGuide } from '@/data/labels'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const options: Temperature[] = ['hot', 'warm', 'cold']

const config: Record<
  Temperature,
  { icon: typeof Flame; tone: string; active: string; idle: string }
> = {
  hot: {
    icon: Flame,
    tone: 'text-hot-600 dark:text-hot-400',
    active:
      'border-hot-500/40 bg-hot-500/12 shadow-[0_8px_24px_-12px_rgba(255,107,0,0.35)] dark:border-hot-400/35 dark:bg-hot-400/12',
    idle: 'border-white/55 bg-white/40 dark:border-white/10 dark:bg-white/5',
  },
  warm: {
    icon: Sun,
    tone: 'text-warm-600 dark:text-warm-400',
    active:
      'border-warm-500/40 bg-warm-500/12 shadow-[0_8px_24px_-12px_rgba(255,176,0,0.35)] dark:border-warm-400/35 dark:bg-warm-400/12',
    idle: 'border-white/55 bg-white/40 dark:border-white/10 dark:bg-white/5',
  },
  cold: {
    icon: Snowflake,
    tone: 'text-cold-600 dark:text-cold-400',
    active:
      'border-cold-500/40 bg-cold-500/12 shadow-[0_8px_24px_-12px_rgba(82,107,128,0.3)] dark:border-cold-400/35 dark:bg-cold-400/12',
    idle: 'border-white/55 bg-white/40 dark:border-white/10 dark:bg-white/5',
  },
}

interface TemperaturePickerProps {
  value: Temperature
  onChange: (value: Temperature) => void
}

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[14px] font-bold text-text">چقدر این سرنخ جدیه؟</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
          بر اساس آخرین صحبت، میزان علاقه و اولویت تماس بعدی را مشخص کن.
        </p>
      </div>

      <div className="space-y-2">
        {options.map((temp) => {
          const active = value === temp
          const guide = temperatureGuide[temp]
          const Icon = config[temp].icon

          return (
            <motion.button
              key={temp}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptic('selection')
                onChange(temp)
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-[16px] border p-3 text-right transition-colors',
                active ? config[temp].active : config[temp].idle,
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-white/70 dark:bg-white/10' : 'glass-inset',
                  config[temp].tone,
                )}
              >
                <Icon size={18} strokeWidth={2.25} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-bold text-text">{guide.title}</p>
                  {active && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3390EC] text-white dark:bg-[#8774E1]">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">
                  {guide.description}
                </p>
                <p className="mt-1 text-[11px] font-medium text-text-soft">{guide.example}</p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
