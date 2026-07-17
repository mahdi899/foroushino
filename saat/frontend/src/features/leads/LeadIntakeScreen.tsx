import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Upload, Share2, Users } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { TemperaturePicker } from '@/components/domain/TemperaturePicker'
import { Button } from '@/components/ui/Button'
import { hasPermission } from '@/lib/permissions'
import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { createLead, distributeLeadsToTeams, importLeadsCsv } from '@/services/leads'
import { syncAppData } from '@/services/sync'
import {
  experienceLabels,
  priorityLabels,
  sourceLabels,
} from '@/data/labels'
import type { CreateLeadInput } from '@/services/leads'
import type { ExperienceLevel, LeadSource, Priority, Temperature } from '@/types'

const usesRemoteData = import.meta.env.VITE_API_MODE === 'http'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

const selectClass = cn(fieldClass, 'appearance-none')

type IntakeForm = {
  firstName: string
  lastName: string
  phone: string
  city: string
  source: LeadSource
  productId: string
  temperature: Temperature
  priority: Priority
  job: string
  experience: ExperienceLevel
  budget: string
  incomeGoal: string
  interestReason: string
  bestCallTime: string
  painPoint: string
  lastNote: string
}

const emptyForm = (): IntakeForm => ({
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  source: 'form',
  productId: '',
  temperature: 'warm',
  priority: 2,
  job: '',
  experience: 'none',
  budget: '',
  incomeGoal: '',
  interestReason: '',
  bestCallTime: '',
  painPoint: '',
  lastNote: '',
})

const sourceOptions = Object.keys(sourceLabels) as LeadSource[]
const experienceOptions = Object.keys(experienceLabels) as ExperienceLevel[]
const priorityOptions: Priority[] = [1, 2, 3]

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
      <h3 className="text-[13px] font-extrabold text-text">{title}</h3>
      {children}
    </section>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-[12px] font-bold text-text-soft">
      {children}
      {required ? <span className="text-error-500"> *</span> : null}
    </span>
  )
}

function buildPayload(form: IntakeForm): CreateLeadInput {
  const payload: CreateLeadInput = {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim() || undefined,
    phone: form.phone.trim(),
    city: form.city.trim() || undefined,
    source: form.source,
    temperature: form.temperature,
    priority: form.priority,
  }

  if (form.productId) payload.product_id = Number(form.productId)
  if (form.job.trim()) payload.job = form.job.trim()
  if (form.experience) payload.experience = form.experience
  if (form.budget.trim()) payload.budget = form.budget.trim()
  if (form.incomeGoal.trim()) payload.income_goal = form.incomeGoal.trim()
  if (form.interestReason.trim()) payload.interest_reason = form.interestReason.trim()
  if (form.bestCallTime.trim()) payload.best_call_time = form.bestCallTime.trim()
  if (form.painPoint.trim()) payload.pain_point = form.painPoint.trim()
  if (form.lastNote.trim()) payload.last_note = form.lastNote.trim()

  return payload
}

export function LeadIntakeScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const products = useStore((s) => s.products.filter((p) => p.isActive))
  const addLead = useStore((s) => s.addLead)
  const distributeLeadsToTeamsLocal = useStore((s) => s.distributeLeadsToTeams)
  const applySyncData = useStore((s) => s.applySyncData)
  const pushToast = useStore((s) => s.pushToast)

  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<IntakeForm>(emptyForm)
  const [busy, setBusy] = useState<'create' | 'import' | 'distribute' | null>(null)

  const canManage = hasPermission(permissions, 'leads.manage')
  const canImport = hasPermission(permissions, 'leads.import')
  const canDistribute = hasPermission(permissions, 'leads.reassign')

  const poolCount = useMemo(
    () =>
      leads.filter(
        (lead) =>
          !lead.assignedAgentId &&
          !lead.assignedTeamId &&
          lead.status === 'new' &&
          !lead.doNotCall,
      ).length,
    [leads],
  )

  const patch = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (!canManage && !canImport && !canDistribute) {
    return null
  }

  const refreshData = async () => {
    if (!usesRemoteData) return
    const payload = await syncAppData({ priorDailyStatsDate: useStore.getState().dailyStatsDate })
    applySyncData(payload)
  }

  const onCreate = async () => {
    if (!form.firstName.trim() || !form.phone.trim()) {
      pushToast('نام و شماره تلفن الزامی است.', 'error')
      return
    }

    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 10) {
      pushToast('شماره تماس معتبر نیست.', 'error')
      return
    }

    setBusy('create')
    try {
      const payload = buildPayload(form)

      if (usesRemoteData) {
        await createLead(payload)
        await refreshData()
      } else {
        addLead({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          source: form.source,
          productId: form.productId || undefined,
          temperature: form.temperature,
          priority: form.priority,
          job: form.job.trim(),
          experience: form.experience,
          budget: form.budget.trim(),
          incomeGoal: form.incomeGoal.trim(),
          interestReason: form.interestReason.trim(),
          bestCallTime: form.bestCallTime.trim(),
          painPoint: form.painPoint.trim(),
          lastNote: form.lastNote.trim(),
        })
      }

      setForm(emptyForm())
      pushToast('مشتری ثبت شد.', 'success')
    } catch {
      pushToast('ثبت مشتری ناموفق بود.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const onImportFile = async (file: File) => {
    setBusy('import')
    try {
      if (usesRemoteData) {
        const result = await importLeadsCsv(file)
        await refreshData()
        pushToast(
          `${toFa(result.imported_count)} مشتری جدید · ${toFa(result.duplicate_count)} تکراری`,
          'success',
        )
      } else {
        pushToast('در حالت دمو، فایل CSV را به‌صورت دستی اضافه کنید یا از فرم استفاده کنید.', 'info')
      }
    } catch {
      pushToast('ورود فایل ناموفق بود.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const onDistribute = async () => {
    if (poolCount === 0) {
      pushToast('مشتری بدون تیم برای تقسیم وجود ندارد.', 'info')
      return
    }
    if (teams.length === 0) {
      pushToast('تیمی برای تقسیم تعریف نشده.', 'error')
      return
    }

    setBusy('distribute')
    try {
      if (usesRemoteData) {
        const result = await distributeLeadsToTeams()
        await refreshData()
        pushToast(
          `${toFa(result.distributed)} مشتری بین ${toFa(result.teams)} تیم تقسیم شد.`,
          'success',
        )
      } else {
        const count = distributeLeadsToTeamsLocal()
        pushToast(`${toFa(count)} مشتری بین سرتیم‌ها تقسیم شد.`, 'success')
      }
    } catch {
      pushToast('تقسیم مشتریان ناموفق بود.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="ورود و تقسیم مشتری"
        subtitle="ثبت کامل اطلاعات و توزیع بین سرتیم‌ها"
        icon={UserPlus}
        iconTone="primary"
      />

      <div className="space-y-4 px-4 pb-24 pt-2">
        <div className="glass-card rounded-[22px] border border-white/55 p-4 dark:border-white/10">
          <p className="text-[12px] font-bold text-text-soft">استخر بدون تیم</p>
          <p className="mt-1 text-[28px] font-black tabular-nums text-text">{toFa(poolCount)}</p>
          <p className="mt-1 text-[11px] font-semibold text-text-muted">
            بین {toFa(teams.length)} تیم به‌صورت نوبتی تقسیم می‌شوند
          </p>
        </div>

        {canManage && (
          <div className="space-y-4">
            <h2 className="px-1 text-[15px] font-extrabold text-text">ثبت دستی مشتری</h2>

            <FormSection title="اطلاعات تماس">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <FieldLabel required>نام</FieldLabel>
                  <input
                    value={form.firstName}
                    onChange={(e) => patch('firstName', e.target.value)}
                    className={fieldClass}
                    autoComplete="given-name"
                  />
                </label>
                <label className="block">
                  <FieldLabel>نام خانوادگی</FieldLabel>
                  <input
                    value={form.lastName}
                    onChange={(e) => patch('lastName', e.target.value)}
                    className={fieldClass}
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label className="block">
                <FieldLabel required>شماره تماس</FieldLabel>
                <input
                  value={form.phone}
                  onChange={(e) => patch('phone', e.target.value)}
                  inputMode="tel"
                  className={cn(fieldClass, 'ltr-nums tabular-nums')}
                  autoComplete="tel"
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                />
              </label>
              <label className="block">
                <FieldLabel>شهر</FieldLabel>
                <input
                  value={form.city}
                  onChange={(e) => patch('city', e.target.value)}
                  className={fieldClass}
                />
              </label>
            </FormSection>

            <FormSection title="منبع و محصول">
              <label className="block">
                <FieldLabel>منبع ورود</FieldLabel>
                <select
                  value={form.source}
                  onChange={(e) => patch('source', e.target.value as LeadSource)}
                  className={selectClass}
                >
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabels[source]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>محصول مورد علاقه</FieldLabel>
                <select
                  value={form.productId}
                  onChange={(e) => patch('productId', e.target.value)}
                  className={selectClass}
                >
                  <option value="">انتخاب نشده</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
            </FormSection>

            <FormSection title="پروفایل مشتری">
              <label className="block">
                <FieldLabel>شغل</FieldLabel>
                <input
                  value={form.job}
                  onChange={(e) => patch('job', e.target.value)}
                  className={fieldClass}
                  placeholder="مثلاً کارمند، فریلنسر، دانشجو"
                />
              </label>
              <label className="block">
                <FieldLabel>سطح تجربه</FieldLabel>
                <select
                  value={form.experience}
                  onChange={(e) => patch('experience', e.target.value as ExperienceLevel)}
                  className={selectClass}
                >
                  {experienceOptions.map((level) => (
                    <option key={level} value={level}>
                      {experienceLabels[level]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <FieldLabel>بودجه تقریبی</FieldLabel>
                  <input
                    value={form.budget}
                    onChange={(e) => patch('budget', e.target.value)}
                    className={fieldClass}
                    placeholder="مثلاً ۵ تا ۱۰ میلیون"
                  />
                </label>
                <label className="block">
                  <FieldLabel>هدف درآمدی</FieldLabel>
                  <input
                    value={form.incomeGoal}
                    onChange={(e) => patch('incomeGoal', e.target.value)}
                    className={fieldClass}
                    placeholder="مثلاً ۳۰ میلیون در ماه"
                  />
                </label>
              </div>
            </FormSection>

            <FormSection title="اولویت و پیگیری">
              <div>
                <FieldLabel>درجه علاقه</FieldLabel>
                <TemperaturePicker
                  value={form.temperature}
                  onChange={(value) => patch('temperature', value)}
                />
              </div>
              <div>
                <FieldLabel>اولویت تماس</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {priorityOptions.map((level) => {
                    const active = form.priority === level
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          haptic('selection')
                          patch('priority', level)
                        }}
                        className={cn(
                          'rounded-[14px] border px-2 py-2.5 text-[12px] font-bold transition-all',
                          active
                            ? 'border-[#3390EC]/35 bg-[#3390EC]/10 text-[#3390EC] dark:border-[#8774E1]/35 dark:bg-[#8774E1]/12 dark:text-[#8774E1]'
                            : 'glass-inset border-white/55 text-text-soft dark:border-white/10',
                        )}
                      >
                        {priorityLabels[level]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <label className="block">
                <FieldLabel>بهترین زمان تماس</FieldLabel>
                <input
                  value={form.bestCallTime}
                  onChange={(e) => patch('bestCallTime', e.target.value)}
                  className={fieldClass}
                  placeholder="مثلاً عصرها بعد از ۱۸"
                />
              </label>
              <label className="block">
                <FieldLabel>دلیل علاقه‌مندی</FieldLabel>
                <textarea
                  value={form.interestReason}
                  onChange={(e) => patch('interestReason', e.target.value)}
                  rows={2}
                  className={cn(fieldClass, 'resize-none leading-relaxed')}
                  placeholder="چرا به دوره علاقه‌مند است؟"
                />
              </label>
              <label className="block">
                <FieldLabel>نقطه درد / چالش</FieldLabel>
                <textarea
                  value={form.painPoint}
                  onChange={(e) => patch('painPoint', e.target.value)}
                  rows={2}
                  className={cn(fieldClass, 'resize-none leading-relaxed')}
                  placeholder="مشکل اصلی که می‌خواهد حل کند"
                />
              </label>
              <label className="block">
                <FieldLabel>یادداشت اولیه</FieldLabel>
                <textarea
                  value={form.lastNote}
                  onChange={(e) => patch('lastNote', e.target.value)}
                  rows={3}
                  className={cn(fieldClass, 'resize-none leading-relaxed')}
                  placeholder="هر نکته‌ای که کارشناس باید بداند"
                />
              </label>
            </FormSection>

            <Button
              full
              size="lg"
              disabled={busy !== null}
              icon={<UserPlus size={16} />}
              onClick={() => void onCreate()}
            >
              {busy === 'create' ? 'در حال ثبت…' : 'ثبت مشتری'}
            </Button>
          </div>
        )}

        {canImport && (
          <section className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <h2 className="text-[15px] font-extrabold text-text">ورود از فایل CSV</h2>
            <p className="text-[11px] font-semibold leading-6 text-text-soft">
              ستون‌های پشتیبانی‌شده: first_name, last_name, phone, city, source, product_id
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onImportFile(file)
                e.target.value = ''
              }}
            />
            <Button
              full
              variant="secondary"
              disabled={busy !== null}
              icon={<Upload size={16} />}
              onClick={() => fileRef.current?.click()}
            >
              {busy === 'import' ? 'در حال ورود…' : 'انتخاب فایل CSV'}
            </Button>
          </section>
        )}

        {canDistribute && (
          <section className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-text">
              <Users size={16} />
              تقسیم بین سرتیم‌ها
            </h2>
            <p className="text-[12px] font-semibold leading-6 text-text-soft">
              مشتریان بدون تیم به‌صورت مساوی بین تیم‌ها تقسیم می‌شوند. هر سرتیم سپس بین
              کارشناسان خودش توزیع می‌کند.
            </p>
            <Button
              full
              variant="secondary"
              disabled={busy !== null || poolCount === 0}
              icon={<Share2 size={16} />}
              onClick={() => void onDistribute()}
            >
              {busy === 'distribute' ? 'در حال تقسیم…' : `تقسیم ${toFa(poolCount)} مشتری`}
            </Button>
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="w-full py-2 text-center text-[12px] font-semibold text-text-soft"
        >
          مشاهده لیست مشتریان
        </button>
      </div>
    </Page>
  )
}
