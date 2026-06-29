import { Sparkles, TrendingUp, TriangleAlert, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'positive' | 'warning' | 'info'

const config: Record<Tone, { icon: typeof Info; bg: string; fg: string }> = {
  positive: { icon: TrendingUp, bg: 'bg-success-50', fg: 'text-success-600' },
  warning: { icon: TriangleAlert, bg: 'bg-warning-50', fg: 'text-warning-600' },
  info: { icon: Sparkles, bg: 'bg-secondary-50', fg: 'text-secondary-600' },
}

export function InsightCard({
  tone,
  title,
  body,
}: {
  tone: Tone
  title: string
  body: string
}) {
  const { icon: Icon, bg, fg } = config[tone]
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-surface p-3.5 shadow-card border border-border/60">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', bg, fg)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-neutral-500">{body}</p>
      </div>
    </div>
  )
}
