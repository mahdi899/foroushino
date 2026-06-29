import { cn } from '@/lib/cn'

interface Tab {
  id: string
  label: string
}

interface SegmentedTabsProps {
  tabs: Tab[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function SegmentedTabs({ tabs, value, onChange, className }: SegmentedTabsProps) {
  return (
    <div
      className={cn(
        'relative flex bg-neutral-100 rounded-2xl p-1 gap-1',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex-1 h-10 rounded-xl text-[13px] font-bold transition-colors z-10',
              active ? 'text-primary-700' : 'text-neutral-500',
            )}
          >
            {active && (
              <span
                className="absolute inset-0 rounded-xl bg-surface shadow-soft transition-transform duration-200 ease-out"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
