import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, ClipboardCheck, Trophy, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'
import { toFa } from '@/lib/format'
import { BRAND_CTA, SAAT_LOGO_ALT, SAAT_LOGO_SRC } from '@/lib/brand'

type Slide = {
  id: string
  icon: LucideIcon
  accent: string
  accentSoft: string
  title: string
  body: string
}

const slides: Slide[] = [
  {
    id: 'call',
    icon: PhoneCall,
    accent: '#006F75',
    accentSoft: 'bg-[#006F75]/12 text-[#006F75] dark:bg-[#2DD4BF]/14 dark:text-[#5EEAD4]',
    title: 'تماس بعدی آماده',
    body: 'مشتری مناسب، همیشه در صف تماس توست.',
  },
  {
    id: 'result',
    icon: ClipboardCheck,
    accent: '#31B545',
    accentSoft: 'bg-[#31B545]/12 text-[#31B545] dark:bg-[#34D399]/14 dark:text-[#6EE7B7]',
    title: 'ثبت سریع نتیجه',
    body: 'بعد از هر تماس، نتیجه را در چند لمس ثبت کن.',
  },
  {
    id: 'team',
    icon: Trophy,
    accent: '#E6A700',
    accentSoft: 'bg-[#E6A700]/14 text-[#B45309] dark:bg-[#FBBF24]/16 dark:text-[#FBBF24]',
    title: 'رقابت با تیم',
    body: 'هدف روزانه و رتبه، انگیزه فروش می‌دهد.',
  },
]

export function OnboardingScreen() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const slide = slides[index]
  const Icon = slide.icon
  const last = index === slides.length - 1

  const goLogin = useCallback(() => {
    haptic('success')
    navigate('/login', { replace: true })
  }, [navigate])

  const skip = useCallback(() => {
    haptic('light')
    navigate('/login', { replace: true })
  }, [navigate])

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= slides.length || next === index) return
    haptic('selection')
    setIndex(next)
  }, [index])

  const goNext = useCallback(() => {
    if (last) {
      goLogin()
      return
    }
    goTo(index + 1)
  }, [goLogin, goTo, index, last])

  return (
    <div className="relative flex h-[100dvh] min-h-full flex-col overflow-hidden bg-[#F7FAFA] dark:bg-[#0F1A1B]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-24 top-24 h-64 w-64 rounded-full opacity-40 blur-3xl transition-colors"
          style={{ backgroundColor: `${slide.accent}33` }}
        />
        <div className="absolute -right-20 bottom-32 h-56 w-56 rounded-full bg-[#006F75]/8 blur-3xl dark:bg-[#2DD4BF]/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-full flex-col px-6 pt-[calc(10px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
        <header className="flex h-12 shrink-0 items-center justify-between">
          <img
            src={SAAT_LOGO_SRC}
            alt={SAAT_LOGO_ALT}
            className="h-auto w-[64px] object-contain opacity-95"
            draggable={false}
          />
          <button
            type="button"
            onClick={skip}
            className="rounded-full px-3 py-2 text-[13px] font-semibold text-text-soft active:text-primary-600"
          >
            رد کردن
          </button>
        </header>

        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center"
          onTouchStart={(e) => {
            touchStartX.current = e.changedTouches[0]?.clientX ?? null
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current
            touchStartX.current = null
            if (start == null) return
            const end = e.changedTouches[0]?.clientX
            if (end == null) return
            const delta = end - start
            // RTL: swipe right (positive) → previous, swipe left → next
            if (delta > 56) goTo(index - 1)
            else if (delta < -56) goTo(index + 1)
          }}
        >
          <div
            className={cn(
              'mb-8 flex h-[132px] w-[132px] items-center justify-center rounded-[36px]',
              'border border-white/70 shadow-[0_18px_40px_-18px_rgba(0,111,117,0.35)]',
              'dark:border-white/10 dark:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]',
              slide.accentSoft,
            )}
          >
            <Icon size={64} strokeWidth={1.75} />
          </div>

          <p className="mb-2 text-[12px] font-bold tracking-wide text-primary-600 dark:text-primary-300">
            {toFa(index + 1)} از {toFa(slides.length)}
          </p>

          <h1 className="max-w-[300px] text-center text-[26px] font-extrabold leading-snug tracking-tight text-text">
            {slide.title}
          </h1>

          <p className="mt-3 max-w-[280px] text-center text-[15px] font-medium leading-7 text-text-soft">
            {slide.body}
          </p>
        </div>

        <footer className="shrink-0 space-y-5">
          <div className="flex items-center justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`اسلاید ${toFa(i + 1)}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index
                    ? 'w-7 bg-primary-600 dark:bg-primary-400'
                    : 'w-2 bg-black/12 dark:bg-white/20',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className={cn(
              'flex h-[52px] w-full items-center justify-center rounded-[16px] text-[16px] font-bold',
              BRAND_CTA,
            )}
          >
            {last ? 'شروع کنیم' : 'ادامه'}
          </button>
        </footer>
      </div>
    </div>
  )
}
