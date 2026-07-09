import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  CheckSquare,
  Square,
  MessagesSquare,
  Lightbulb,
  ShieldAlert,
  ChevronLeft,
  MessageCircleWarning,
  type LucideIcon,
} from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Chip } from '@/components/ui/Chip'
import {
  startChecklist,
  scriptsLibrary,
  successTips,
  callingRules,
  commissionRules,
} from '@/data/mockExtra'
import { cn } from '@/lib/cn'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'
const OK = 'text-emerald-600 dark:text-emerald-400'
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

const sectionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: spring },
}

const stageLabels: Record<string, string> = {
  opening: 'شروع مکالمه',
  discovery: 'شناخت نیاز',
  pitch: 'معرفی محصول',
  objection: 'پاسخ به اعتراض',
  closing: 'بستن فروش',
}

const stages = ['opening', 'discovery', 'pitch', 'objection', 'closing']

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-text">
      <span className="icon-3d icon-3d-primary flex h-7 w-7 items-center justify-center">
        <Icon size={14} className="text-white" strokeWidth={2.35} />
      </span>
      {children}
    </h2>
  )
}

function GlassLinkBtn({
  icon: Icon,
  label,
  tone = 'primary',
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone?: 'primary' | 'warning'
  onClick: () => void
}) {
  const tones = {
    primary: 'border-white/55 dark:border-white/10',
    warning: 'border-amber-500/25 bg-amber-500/8 dark:border-amber-400/20',
  }

  return (
    <motion.button
      type="button"
      variants={fadeUp}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        'glass-card flex w-full items-center gap-3 rounded-[20px] border p-4 text-right',
        tones[tone],
      )}
    >
      <Icon size={20} className={cn('shrink-0', tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : TG)} strokeWidth={2.25} />
      <span className="flex-1 text-[13px] font-bold text-text">{label}</span>
      <ChevronLeft size={16} className="shrink-0 text-text-soft opacity-45" strokeWidth={2.25} />
    </motion.button>
  )
}

export function TrainingScreen() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [stage, setStage] = useState<string>('all')

  const filteredScripts = useMemo(
    () => (stage === 'all' ? scriptsLibrary : scriptsLibrary.filter((s) => s.stage === stage)),
    [stage],
  )

  const toggle = (item: string) => {
    haptic('selection')
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const checkedCount = checked.size
  const progressPct = startChecklist.length ? Math.round((checkedCount / startChecklist.length) * 100) : 0

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="آموزش و اسکریپت فروش"
        subtitle="چک‌لیست، اسکریپت، پاسخ اعتراض و قوانین"
        icon={GraduationCap}
        iconTone="secondary"
      />

      <motion.div variants={sectionStagger} initial="hidden" animate="show" className="space-y-6 px-4 pt-1 pb-8">
        <motion.section variants={fadeUp}>
          <SectionTitle icon={CheckSquare}>چک‌لیست شروع شیفت</SectionTitle>
          <div className="glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10">
            <div className="border-b border-white/40 px-4 py-3 dark:border-white/8">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                <span className="text-text-soft">پیشرفت آماده‌سازی</span>
                <span className="tabular-nums text-text">
                  {toFa(checkedCount)} / {toFa(startChecklist.length)}
                </span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            {startChecklist.map((item, i) => {
              const isChecked = checked.has(item)
              return (
                <motion.button
                  key={item}
                  type="button"
                  whileTap={{ scale: 0.99 }}
                  onClick={() => toggle(item)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3.5 text-right transition-colors',
                    i < startChecklist.length - 1 && 'border-b border-white/40 dark:border-white/8',
                    isChecked && 'bg-emerald-500/[0.06]',
                  )}
                >
                  <motion.span
                    animate={{ scale: isChecked ? [1, 1.15, 1] : 1 }}
                    transition={{ duration: 0.25 }}
                    className="mt-0.5 shrink-0"
                  >
                    {isChecked ? (
                      <CheckSquare size={18} className={OK} strokeWidth={2.35} />
                    ) : (
                      <Square size={18} className="text-text-soft opacity-50" strokeWidth={2.25} />
                    )}
                  </motion.span>
                  <span
                    className={cn(
                      'flex-1 text-[13px] font-semibold leading-6',
                      isChecked ? 'text-text-soft line-through' : 'text-text',
                    )}
                  >
                    {item}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={MessagesSquare}>اسکریپت فروش</SectionTitle>
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-0.5 no-scrollbar">
            <Chip active={stage === 'all'} tone="primary" onClick={() => setStage('all')}>
              همه
            </Chip>
            {stages.map((s) => (
              <Chip key={s} active={stage === s} tone="primary" onClick={() => setStage(s)}>
                {stageLabels[s]}
              </Chip>
            ))}
          </div>
          <div className="space-y-3">
            {filteredScripts.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.04 }}
                className="glass-card rounded-[20px] border border-white/55 p-4 dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-bold text-text">{s.title}</p>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                      'border-[#3390EC]/22 bg-[#3390EC]/10 dark:border-[#8774E1]/28 dark:bg-[#8774E1]/12',
                      TG,
                    )}
                  >
                    {stageLabels[s.stage] ?? s.stage}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] font-medium leading-7 text-text-muted">{s.content}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <GlassLinkBtn
          icon={MessageCircleWarning}
          tone="warning"
          label="کتابخانه اعتراض‌ها و پاسخ‌های پیشنهادی"
          onClick={() => navigate('/training/objections')}
        />

        <motion.section variants={fadeUp}>
          <SectionTitle icon={Lightbulb}>نکات موفقیت</SectionTitle>
          <div className="space-y-2.5">
            {successTips.map((tip, i) => (
              <motion.div
                key={tip}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                className={cn(
                  'glass-inset flex items-start gap-3 rounded-[18px] border border-amber-500/20 p-3.5',
                  'dark:border-amber-400/15',
                )}
              >
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" strokeWidth={2.35} />
                <p className="text-[13px] font-medium leading-6 text-text-muted">{tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionTitle icon={ShieldAlert}>قوانین تماس</SectionTitle>
          <div className="glass-card overflow-hidden rounded-[22px] border border-white/55 dark:border-white/10">
            {callingRules.map((rule, i) => (
              <div
                key={rule}
                className={cn(
                  'flex items-start gap-3 px-4 py-3.5',
                  i < callingRules.length - 1 && 'border-b border-white/40 dark:border-white/8',
                )}
              >
                <ShieldAlert size={15} className="mt-0.5 shrink-0 text-red-500" strokeWidth={2.35} />
                <p className="text-[13px] font-medium leading-6 text-text-muted">{rule}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.button
          variants={fadeUp}
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/wallet/rules')}
          className={cn(
            'glass-inset flex w-full items-center gap-3 rounded-[18px] border border-dashed',
            'border-white/55 p-4 text-right dark:border-white/10',
          )}
        >
          <span className="flex-1 text-[13px] font-bold text-text-muted">
            قوانین پورسانت ({toFa(commissionRules.length)} قانون)
          </span>
          <ChevronLeft size={16} className="shrink-0 text-text-soft opacity-45" strokeWidth={2.25} />
        </motion.button>
      </motion.div>
    </Page>
  )
}
