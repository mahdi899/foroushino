import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { availabilityLabels } from '@/data/labels'
import { availabilityDotClass, availabilityIcon } from '@/components/domain/icons'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { isShiftOpen } from '@/lib/shiftUtils'
import { performSetAvailability } from '@/services/shiftActions'
import type { Availability } from '@/types'

const OPTIONS: Availability[] = ['available', 'on_break', 'offline']

export function AvailabilityPill() {
  const [open, setOpen] = useState(false)
  const availability = useStore((s) => s.availability)
  const workSession = useStore((s) => s.workSession)
  const navigate = useNavigate()

  if (!isShiftOpen(workSession)) {
    return (
      <button
        onClick={() => navigate('/shift-start')}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-warning-200 bg-warning-50 px-3 text-[11px] font-extrabold text-warning-700"
      >
        <span className="h-2 w-2 rounded-full bg-warning-500" />
        شیفت را شروع کن
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-surface px-3 text-[11px] font-extrabold text-neutral-600 shadow-sm"
      >
        <span className={cn('h-2 w-2 rounded-full', availabilityDotClass[availability])} />
        {availabilityLabels[availability]}
      </button>
      <AvailabilitySheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function AvailabilitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const availability = useStore((s) => s.availability)
  const pushToast = useStore((s) => s.pushToast)
  const navigate = useNavigate()

  return (
    <BottomSheet open={open} onClose={onClose} title="وضعیت کاری">
      <div className="space-y-2 pb-1">
        {OPTIONS.map((status) => {
          const Icon = availabilityIcon[status]
          const active = availability === status
          return (
            <button
              key={status}
              onClick={() => {
                haptic('selection')
                void performSetAvailability(status).then(() => {
                  pushToast(`وضعیت به «${availabilityLabels[status]}» تغییر کرد`, 'info')
                  onClose()
                })
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors',
                active ? 'border-primary-300 bg-primary-50' : 'border-border/60 bg-surface',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500',
                )}
              >
                <Icon size={18} strokeWidth={2.25} />
              </span>
              <span className="flex-1 text-[14px] font-extrabold text-neutral-900">
                {availabilityLabels[status]}
              </span>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />}
            </button>
          )
        })}

        <button
          onClick={() => {
            onClose()
            navigate('/work-status')
          }}
          className="mt-1 flex w-full items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3.5 text-[13px] font-extrabold text-neutral-600"
        >
          مشاهده وضعیت کاری من
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={() => {
            onClose()
            navigate('/work-status')
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-[13px] font-bold text-error-600"
        >
          <LogOut size={15} />
          پایان شیفت
        </button>
      </div>
    </BottomSheet>
  )
}
