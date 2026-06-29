import { Calendar, Clock } from 'lucide-react'
import { toFa, formatJalaliShort } from '@/lib/format'
import { cn } from '@/lib/cn'

interface FollowupPickerProps {
  dayOffset: number | null
  hour: number
  onDayChange: (offset: number) => void
  onHourChange: (hour: number) => void
}

const dayOptions = [
  { offset: 0, label: 'امروز' },
  { offset: 1, label: 'فردا' },
  { offset: 2, label: '۲ روز دیگر' },
  { offset: 7, label: 'هفته بعد' },
]

const hourOptions = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19]

export function buildFollowupIso(dayOffset: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export function FollowupPicker({ dayOffset, hour, onDayChange, onHourChange }: FollowupPickerProps) {
  const selectedDate = dayOffset !== null ? new Date(buildFollowupIso(dayOffset, hour)) : null
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-neutral-500">
          <Calendar size={14} className="text-primary-500" />
          تاریخ پیگیری
        </p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {dayOptions.map((opt) => (
            <button
              key={opt.offset}
              onClick={() => onDayChange(opt.offset)}
              className={cn(
                'flex shrink-0 flex-col items-center rounded-2xl border px-4 py-2.5 transition-colors',
                dayOffset === opt.offset
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-border bg-surface text-neutral-500',
              )}
            >
              <span className="text-[13px] font-extrabold">{opt.label}</span>
              <span className="text-[10px] font-bold opacity-70">
                {formatJalaliShort(new Date(buildFollowupIso(opt.offset, hour)))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-neutral-500">
          <Clock size={14} className="text-primary-500" />
          ساعت
        </p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {hourOptions.map((h) => (
            <button
              key={h}
              onClick={() => onHourChange(h)}
              className={cn(
                'shrink-0 rounded-xl border px-3.5 py-2 text-[13px] font-extrabold tabular-nums transition-colors',
                hour === h
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-border bg-surface text-neutral-500',
              )}
            >
              {toFa(String(h).padStart(2, '0'))}:۰۰
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
        <p className="text-center text-[11px] font-bold text-neutral-400">
          پیگیری بعدی: {formatJalaliShort(selectedDate)} ساعت {toFa(String(hour).padStart(2, '0'))}:۰۰
        </p>
      )}
    </div>
  )
}
