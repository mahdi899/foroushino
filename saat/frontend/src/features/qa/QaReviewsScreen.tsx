import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { DataGate } from '@/components/pwa/DataGate'
import { http } from '@/services/http'

interface QualityReview {
  id: number
  call_id: number
  agent_id: number
  score: number
  status: string
  notes?: string | null
}

export function QaReviewsScreen() {
  const [reviews, setReviews] = useState<QualityReview[]>([])

  useEffect(() => {
    let cancelled = false
    http
      .get<QualityReview[]>('/quality/reviews')
      .then((rows) => {
        if (!cancelled) setReviews(rows)
      })
      .catch(() => {
        if (!cancelled) setReviews([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Page>
      <ScreenHeader sticky title="کنترل کیفیت" subtitle="بررسی تماس‌ها" icon={ShieldCheck} iconTone="primary" />
      <DataGate mode="placeholder">
        <div className="space-y-2 px-4 pb-24 pt-2">
          {reviews.length === 0 ? (
            <p className="rounded-2xl bg-surface p-4 text-center text-sm font-bold text-text-soft">
              موردی برای بررسی نیست.
            </p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="glass-card rounded-2xl border border-white/55 p-4 dark:border-white/10"
              >
                <p className="text-[14px] font-extrabold text-text">تماس #{review.call_id}</p>
                <p className="mt-1 text-[12px] font-semibold text-text-soft">
                  وضعیت: {review.status} — امتیاز: {review.score}
                </p>
              </div>
            ))
          )}
        </div>
      </DataGate>
    </Page>
  )
}
