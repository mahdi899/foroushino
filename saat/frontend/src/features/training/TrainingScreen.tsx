import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  CheckSquare,
  Square,
  MessagesSquare,
  Lightbulb,
  ShieldAlert,
  ChevronLeft,
  MessageCircleWarning,
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

const stageLabels: Record<string, string> = {
  opening: 'شروع مکالمه',
  discovery: 'شناخت نیاز',
  pitch: 'معرفی محصول',
  objection: 'پاسخ به اعتراض',
  closing: 'بستن فروش',
}

const stages = ['opening', 'discovery', 'pitch', 'objection', 'closing']

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

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        title="آموزش و اسکریپت فروش"
        subtitle="چک‌لیست، اسکریپت، پاسخ اعتراض و قوانین"
        icon={GraduationCap}
        iconTone="secondary"
      />

      <div className="space-y-6 px-4 pt-1">
        <section>
          <h2 className="mb-3 text-[14px] font-extrabold text-neutral-900">چک‌لیست شروع شیفت</h2>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
            {startChecklist.map((item, i) => {
              const isChecked = checked.has(item)
              return (
                <button
                  key={item}
                  onClick={() => toggle(item)}
                  className={cn(
                    'flex w-full items-start gap-2.5 px-4 py-3.5 text-right',
                    i < startChecklist.length - 1 && 'border-b border-border/60',
                  )}
                >
                  {isChecked ? (
                    <CheckSquare size={18} className="mt-0.5 shrink-0 text-success-500" />
                  ) : (
                    <Square size={18} className="mt-0.5 shrink-0 text-neutral-300" />
                  )}
                  <span
                    className={cn(
                      'flex-1 text-[12.5px] font-bold leading-6',
                      isChecked ? 'text-neutral-400 line-through' : 'text-neutral-700',
                    )}
                  >
                    {item}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold text-neutral-900">
              <MessagesSquare size={16} className="text-primary-500" />
              اسکریپت فروش
            </h2>
          </div>
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
          <div className="space-y-2.5">
            {filteredScripts.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border/60 bg-surface p-3.5 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-extrabold text-neutral-900">{s.title}</p>
                  <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">
                    {stageLabels[s.stage] ?? s.stage}
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] font-bold leading-7 text-neutral-600">{s.content}</p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={() => navigate('/training/objections')}
          className="flex w-full items-center gap-3 rounded-2xl bg-warning-50 p-4 text-right"
        >
          <MessageCircleWarning size={20} className="shrink-0 text-warning-600" />
          <span className="flex-1 text-[13px] font-extrabold text-warning-700">
            کتابخانه اعتراض‌ها و پاسخ‌های پیشنهادی
          </span>
          <ChevronLeft size={16} className="shrink-0 text-warning-400" />
        </button>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-extrabold text-neutral-900">
            <Lightbulb size={16} className="text-accent-500" />
            نکات موفقیت
          </h2>
          <div className="space-y-2">
            {successTips.map((tip) => (
              <div key={tip} className="flex items-start gap-2.5 rounded-2xl bg-accent-50 p-3.5">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-accent-600" />
                <p className="text-[12.5px] font-bold leading-6 text-accent-800">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-extrabold text-neutral-900">
            <ShieldAlert size={16} className="text-error-500" />
            قوانین تماس
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card">
            {callingRules.map((rule, i) => (
              <div
                key={rule}
                className={cn(
                  'flex items-start gap-2.5 px-4 py-3.5',
                  i < callingRules.length - 1 && 'border-b border-border/60',
                )}
              >
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-error-500" />
                <p className="text-[12.5px] font-bold leading-6 text-neutral-700">{rule}</p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={() => navigate('/wallet/rules')}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-right"
        >
          <span className="flex-1 text-[12.5px] font-extrabold text-neutral-600">
            قوانین پورسانت ({toFa(commissionRules.length)} قانون)
          </span>
          <ChevronLeft size={16} className="shrink-0 text-neutral-300" />
        </button>
      </div>
    </Page>
  )
}
