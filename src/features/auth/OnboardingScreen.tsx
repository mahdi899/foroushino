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

export function OnboardingScreen() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const Icon = slide.icon
  const last = index === slides.length - 1

  return (
    <div className="flex h-full flex-col px-6 pt-[calc(20px+var(--safe-top))] pb-[calc(24px+var(--safe-bottom))]">
      <div className="flex justify-end">
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-sm font-bold text-neutral-400"
        >
          رد کردن
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[40px] bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-float">
              <Icon size={56} />
            </div>
            <h2 className="text-2xl font-black text-neutral-900">{slide.title}</h2>
            <p className="mt-3 max-w-[280px] text-[15px] leading-7 text-neutral-500">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 rounded-full transition-all',
              i === index ? 'w-7 bg-primary-600' : 'w-2 bg-neutral-300',
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
    </div>
  )
}
