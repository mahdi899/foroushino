import { useEffect, useState } from 'react'
import { ShieldCheck, Star } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { DataGate } from '@/components/pwa/DataGate'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { http } from '@/services/http'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'

interface QualityReview {
  id: number
  call_id: number
  agent_id: number
  score: number
  status: string
  notes?: string | null
  criteria_scores?: Record<string, number> | null
  call?: {
    result?: string
    note?: string | null
    lead?: { first_name?: string; last_name?: string }
  }
  agent?: { name?: string }
}

const criteria = [
  { key: 'greeting', label: 'شروع تماس' },
  { key: 'needs', label: 'کشف نیاز' },
  { key: 'closing', label: 'جمع‌بندی' },
]

export function QaReviewsScreen() {
  const [reviews, setReviews] = useState<QualityReview[]>([])
  const [active, setActive] = useState<QualityReview | null>(null)
  const [score, setScore] = useState(0)
  const [notes, setNotes] = useState('')
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const rows = await http.get<QualityReview[]>('/quality/reviews')
    setReviews(rows)
  }

  useEffect(() => {
    void load().catch(() => setReviews([]))
  }, [])

  const openReview = (review: QualityReview) => {
    setActive(review)
    setScore(review.score || 0)
    setNotes(review.notes ?? '')
    setCriteriaScores(review.criteria_scores ?? {})
  }

  const saveReview = async () => {
    if (!active || saving) return
    setSaving(true)
    try {
      await http.patch(`/quality/reviews/${active.id}`, {
        score,
        notes,
        criteria_scores: criteriaScores,
        status: 'reviewed',
      })
      haptic('success')
      setActive(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const createCoachingTask = async () => {
    if (!active) return
    await http.post('/quality/coaching-tasks', {
      agent_id: active.agent_id,
      quality_review_id: active.id,
      title: 'تمرین پس از بررسی کیفیت',
      description: notes || 'پیگیری نکات مطرح‌شده در QA',
      due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
    haptic('success')
    setActive(null)
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        backFallback="/home"
        onBack={active ? () => setActive(null) : undefined}
        title="کنترل کیفیت"
        subtitle="بررسی تماس‌ها"
        icon={ShieldCheck}
        iconTone="primary"
      />
      <DataGate mode="placeholder">
        <div className="space-y-2 px-4 pb-[calc(24px+var(--safe-bottom))] pt-2">
          {reviews.length === 0 ? (
            <p className="rounded-2xl bg-surface p-4 text-center text-sm font-bold text-text-soft">
              موردی برای بررسی نیست.
            </p>
          ) : (
            reviews.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => openReview(review)}
                className="glass-card w-full rounded-2xl border border-white/55 p-4 text-right dark:border-white/10"
              >
                <p className="text-[14px] font-extrabold text-text">
                  {review.call?.lead?.first_name} {review.call?.lead?.last_name} — {review.agent?.name}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-text-soft">
                  وضعیت: {review.status} — امتیاز: {toFa(review.score)}
                </p>
              </button>
            ))
          )}
        </div>
      </DataGate>

      <BottomSheet open={!!active} onClose={() => setActive(null)} title="بررسی تماس">
        {active && (
          <div className="space-y-4">
            <p className="text-[12px] font-semibold text-text-soft">
              نتیجه: {active.call?.result ?? '—'} — {active.call?.note ?? 'بدون یادداشت'}
            </p>
            <div>
              <p className="mb-2 text-[13px] font-bold">امتیاز کلی</p>
              <div className="flex gap-2">
                {[20, 40, 60, 80, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScore(value)}
                    className={`rounded-xl px-3 py-2 text-[12px] font-extrabold ${
                      score === value ? 'bg-primary-500 text-white' : 'bg-black/[0.05] dark:bg-white/10'
                    }`}
                  >
                    {toFa(value)}
                  </button>
                ))}
              </div>
            </div>
            {criteria.map((item) => (
              <div key={item.key}>
                <p className="mb-2 text-[12px] font-bold">{item.label}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => setCriteriaScores((prev) => ({ ...prev, [item.key]: value * 20 }))}>
                      <Star
                        size={22}
                        className={
                          (criteriaScores[item.key] ?? 0) >= value * 20
                            ? 'fill-warning-400 text-warning-400'
                            : 'text-neutral-300'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="یادداشت سوپروایزر"
              className="w-full rounded-xl border border-border/60 bg-surface p-3 text-[13px] font-semibold outline-none"
            />
            <Button full onClick={() => void saveReview()} disabled={saving}>
              ذخیره بررسی
            </Button>
            <Button full variant="secondary" onClick={() => void createCoachingTask()}>
              ایجاد وظیفه کوچینگ
            </Button>
          </div>
        )}
      </BottomSheet>
    </Page>
  )
}
