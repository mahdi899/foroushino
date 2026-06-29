import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />
}

export function LeadCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-border/50 bg-surface shadow-card">
      <div className="p-4 pr-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
        </div>
        <Skeleton className="mt-2.5 h-3 w-full" />
        <div className="mt-3 border-t border-border/50 pt-2.5">
          <Skeleton className="h-3.5 w-full" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </div>
  )
}
