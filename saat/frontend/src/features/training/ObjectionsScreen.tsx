import { useMemo, useState } from 'react'
import { MessageCircleWarning, Copy, Search } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/ui/States'
import { objectionsLibrary } from '@/data/mockExtra'
import { useStore } from '@/store/useStore'
import { haptic } from '@/lib/telegram'

export function ObjectionsScreen() {
  const pushToast = useStore((s) => s.pushToast)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return objectionsLibrary
    return objectionsLibrary.filter(
      (o) => o.title.includes(q) || o.suggestedResponse.includes(q) || o.category.includes(q),
    )
  }, [query])

  const groups = useMemo(() => {
    const map = new Map<string, typeof objectionsLibrary>()
    for (const o of filtered) {
      const list = map.get(o.category) ?? []
      list.push(o)
      map.set(o.category, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <Page withNav={false}>
      <TopBar title="کتابخانه اعتراض‌ها" subtitle="پاسخ آماده برای هر اعتراض رایج" />

      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-neutral-50 px-3.5 py-2.5">
          <Search size={16} className="shrink-0 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی اعتراض..."
            className="w-full bg-transparent text-[13px] font-bold text-neutral-800 outline-none placeholder:text-neutral-400"
          />
        </div>

        {groups.length === 0 ? (
          <EmptyState icon={<MessageCircleWarning size={32} />} title="چیزی پیدا نشد" description="عبارت دیگری را جستجو کن." />
        ) : (
          groups.map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-2.5 px-1 text-[12px] font-extrabold text-neutral-400">{category}</h2>
              <div className="space-y-2.5">
                {items.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-warning-200/60 bg-warning-50/40 p-3.5">
                    <div className="flex items-start gap-2">
                      <MessageCircleWarning size={16} className="mt-0.5 shrink-0 text-warning-600" />
                      <p className="flex-1 text-[13px] font-extrabold text-neutral-900">{o.title}</p>
                    </div>
                    <p className="mt-2 text-[12.5px] font-bold leading-7 text-neutral-600">
                      {o.suggestedResponse}
                    </p>
                    <button
                      onClick={() => {
                        haptic('success')
                        navigator.clipboard?.writeText(o.suggestedResponse).catch(() => {})
                        pushToast('پاسخ کپی شد')
                      }}
                      className="mt-2.5 flex items-center gap-1.5 text-[11px] font-extrabold text-primary-600"
                    >
                      <Copy size={12} />
                      کپی پاسخ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Page>
  )
}
