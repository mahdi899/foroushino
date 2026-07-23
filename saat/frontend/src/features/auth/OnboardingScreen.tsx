import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, Target, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { haptic } from '@/lib/telegram'
import { SAAT_LOGO_ALT, SAAT_LOGO_SRC } from '@/lib/brand'

const highlights = [
  {
    id: 'next-call',
    icon: PhoneCall,
    title: 'تماس بعدی آماده',
    body: 'بهترین مشتری برای تماس بعدی پیشنهاد می‌شود.',
  },
  {
    id: 'quick-result',
    icon: Target,
    title: 'ثبت سریع نتیجه',
    body: 'بعد از هر تماس، نتیجه را با چند لمس ثبت کن.',
  },
  {
    id: 'team-rank',
    icon: Trophy,
    title: 'رقابت تیمی',
    body: 'هدف روزانه و رتبه‌بندی، انگیزه فروش می‌دهد.',
  },
] as const

export function OnboardingScreen() {
  const navigate = useNavigate()

  const goLogin = useCallback(() => {
    haptic('medium')
    navigate('/login', { replace: true })
  }, [navigate])

  const skip = useCallback(() => {
    haptic('light')
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className="relative flex h-[100dvh] min-h-full flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#17212B]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#3390EC]/10 blur-3xl dark:bg-[#8774E1]/14" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[#8774E1]/8 blur-3xl dark:bg-[#3390EC]/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-full flex-col px-5 pt-[calc(8px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
        <header className="flex h-11 shrink-0 items-center justify-between">
          <img
            src={SAAT_LOGO_SRC}
            alt={SAAT_LOGO_ALT}
            className="h-auto w-[68px] object-contain opacity-90"
            draggable={false}
          />
          <button
            type="button"
            onClick={skip}
            className="rounded-full px-3 py-2 text-[13px] font-semibold text-[#707579] active:text-[#3390EC] dark:text-[#8E9396] dark:active:text-[#8774E1]"
          >
            رد کردن
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center py-6">
          <p className="text-center text-[13px] font-semibold text-[#3390EC] dark:text-[#8774E1]">
            خوش آمدید به سات
          </p>
          <h1 className="mt-2 text-center text-[24px] font-bold leading-snug tracking-tight text-[#000000] dark:text-[#F5F5F5]">
            فروش حرفه‌ای، ساده‌تر
          </h1>
          <p className="mx-auto mt-2.5 max-w-[300px] text-center text-[14px] leading-relaxed text-[#707579] dark:text-[#8E9396]">
            ابزار کال‌سنتر و مدیریت فروش برای تیم شما.
          </p>

          <ul className="mx-auto mt-8 w-full max-w-[340px] space-y-3">
            {highlights.map(({ id, icon: Icon, title, body }) => (
              <li
                key={id}
                className="flex items-start gap-3 rounded-[16px] border border-black/[0.06] bg-black/[0.02] px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#3390EC]/12 text-[#3390EC] dark:bg-[#8774E1]/18 dark:text-[#8774E1]">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text">{title}</p>
                  <p className="mt-0.5 text-[12px] font-medium leading-5 text-text-soft">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <footer className="shrink-0">
          <button
            type="button"
            onClick={goLogin}
            className={cn(
              'flex h-[50px] w-full items-center justify-center rounded-[12px] text-[16px] font-semibold text-white',
              'bg-[#3390EC] active:bg-[#2B7FD4] dark:bg-[#8774E1] dark:active:bg-[#7563D4]',
              'shadow-[0_8px_20px_-10px_rgba(51,144,236,0.45)] dark:shadow-[0_8px_20px_-10px_rgba(135,116,225,0.4)]',
            )}
          >
            شروع کنیم
          </button>
        </footer>
      </div>
    </div>
  )
}
