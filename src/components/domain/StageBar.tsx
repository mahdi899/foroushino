import { Check } from 'lucide-react'
import type { SaleStage } from '@/types'
import { stageLabels, stageOrder } from '@/data/labels'
import { cn } from '@/lib/cn'

export function StageBar({ stage }: { stage: SaleStage }) {
  if (stage === 'lost') {
    return (
      <div className="rounded-2xl bg-error-50 px-4 py-3 text-center text-sm font-bold text-error-600">
        {stageLabels.lost}
      </div>
    )
  }
  const currentIndex = stageOrder.indexOf(stage)
  return (
    <div className="flex items-center">
      {stageOrder.map((s, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={s} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold',
                  done && 'bg-primary-500 text-white',
                  active && 'bg-primary-600 text-white ring-4 ring-primary-100',
                  !done && !active && 'bg-neutral-100 text-neutral-400',
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              {i < stageOrder.length - 1 && (
                <div className={cn('h-1 flex-1 rounded-full', i < currentIndex ? 'bg-primary-400' : 'bg-neutral-100')} />
              )}
            </div>
            <span
              className={cn(
                'mt-1.5 w-12 text-center text-[9px] font-bold leading-3',
                active ? 'text-primary-700' : 'text-neutral-400',
              )}
            >
              {stageLabels[s]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
