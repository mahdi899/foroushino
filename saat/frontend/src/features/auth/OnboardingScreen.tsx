import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, PhoneCall, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const slides = [
  {
    icon: PhoneCall,
    title: 'تماس بعدی همیشه آماده‌ست',
    body: 'سیستم بهترین سرنخ را برایت انتخاب می‌کند تا فقط روی فروش تمرکز کنی.',
  },
  {
    icon: Target,
    title: 'نتیجه را سریع ثبت کن',
    body: 'بعد از هر تماس، با چند لمس نتیجه و پیگیری بعدی را ثبت کن.',
  },
  {
    icon: Trophy,
    title: 'با تیم رقابت کن',
    body: 'هدف روزانه، امتیاز و رتبه‌بندی تیمی به تو انگیزه می‌دهد.',
  },
]

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
}

export function OnboardingScreen() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const Icon = slide.icon
  const last = index === slides.length - 1

  return (
    <div className="flex h-full min-h-full flex-col px-5 pt-[calc(8px+var(--safe-top))] pb-[calc(20px+var(--safe-bottom))]">
      <header className="flex h-10 shrink-0 items-center justify-end">
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="px-1 py-2 text-[13px] font-bold text-neutral-400 active:text-neutral-500"
        >
          رد کردن
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            {...fade}
            className="flex flex-col items-center text-center"
          >
            <div
              className="mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_12px_32px_-12px_rgba(0,111,117,0.45)]"
            >
              <Icon size={40} strokeWidth={2.25} />
            </div>
            <h2 className="text-[21px] font-black leading-snug text-neutral-900">
              {slide.title}
            </h2>
            <p className="mt-2.5 max-w-[280px] text-[14px] leading-[1.65] text-neutral-500">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="shrink-0 space-y-5">
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out',
                i === index ? 'w-6 bg-primary-600' : 'w-1.5 bg-neutral-300',
              )}
            />
          ))}
        </div>

        <Button
          size="lg"
          full
          onClick={() => (last ? navigate('/login', { replace: true }) : setIndex((i) => i + 1))}
        >
          {last ? 'شروع کنیم' : 'بعدی'}
        </Button>
      </footer>
    </div>
  )
}
