import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Upload, Share2, Users } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { hasPermission } from '@/lib/permissions'
import { toFa } from '@/lib/format'
import { createLead, distributeLeadsToTeams, importLeadsCsv } from '@/services/leads'
import { syncAppData } from '@/services/sync'

const usesRemoteData = import.meta.env.VITE_API_MODE === 'http'

export function LeadIntakeScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const addLead = useStore((s) => s.addLead)
  const distributeLeadsToTeamsLocal = useStore((s) => s.distributeLeadsToTeams)
  const applySyncData = useStore((s) => s.applySyncData)
  const pushToast = useStore((s) => s.pushToast)

  const fileRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
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

  if (!canManage && !canImport && !canDistribute) {
    return null
  }

  const refreshData = async () => {
    if (!usesRemoteData) return
    const payload = await syncAppData()
    applySyncData(payload)
  }

  const onCreate = async () => {
    if (!firstName.trim() || !phone.trim()) {
      pushToast('نام و شماره تلفن الزامی است.', 'error')
      return
    }

    setBusy('create')
    try {
      if (usesRemoteData) {
        await createLead({
          first_name: firstName.trim(),
          last_name: lastName.trim() || undefined,
          phone: phone.trim(),
          city: city.trim() || undefined,
          source: 'form',
        })
        await refreshData()
      } else {
        addLead({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          city: city.trim(),
        })
      }
      setFirstName('')
      setLastName('')
      setPhone('')
      setCity('')
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
        subtitle="ثبت مشتری جدید و توزیع بین سرتیم‌ها"
        icon={UserPlus}
        iconTone="primary"
      />

      <div className="space-y-5 px-4 pb-24 pt-2">
        <div className="glass-card rounded-[22px] border border-white/55 p-4 dark:border-white/10">
          <p className="text-[12px] font-bold text-text-soft">استخر بدون تیم</p>
          <p className="mt-1 text-[28px] font-black tabular-nums text-text">{toFa(poolCount)}</p>
          <p className="mt-1 text-[11px] font-semibold text-text-muted">
            بین {toFa(teams.length)} تیم به‌صورت نوبتی تقسیم می‌شوند
          </p>
        </div>

        {canManage && (
          <section className="space-y-3">
            <h2 className="text-[15px] font-extrabold text-neutral-900">ثبت دستی مشتری</h2>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-text-soft">نام</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-text-soft">نام خانوادگی</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-text-soft">شماره تماس</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-bold text-text-soft">شهر</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-[14px] font-semibold"
              />
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void onCreate()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
            >
              <UserPlus size={16} />
              {busy === 'create' ? 'در حال ثبت…' : 'ثبت مشتری'}
            </button>
          </section>
        )}

        {canImport && (
          <section className="space-y-3">
            <h2 className="text-[15px] font-extrabold text-neutral-900">ورود از فایل CSV</h2>
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
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-surface py-3.5 text-sm font-extrabold text-neutral-900 disabled:opacity-50"
            >
              <Upload size={16} />
              {busy === 'import' ? 'در حال ورود…' : 'انتخاب فایل CSV'}
            </button>
          </section>
        )}

        {canDistribute && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-neutral-900">
              <Users size={16} />
              تقسیم بین سرتیم‌ها
            </h2>
            <p className="text-[12px] font-semibold leading-6 text-text-soft">
              مشتریان بدون تیم به‌صورت مساوی بین تیم‌ها تقسیم می‌شوند. هر سرتیم سپس بین
              کارشناسان خودش توزیع می‌کند.
            </p>
            <button
              type="button"
              disabled={busy !== null || poolCount === 0}
              onClick={() => void onDistribute()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
            >
              <Share2 size={16} />
              {busy === 'distribute' ? 'در حال تقسیم…' : `تقسیم ${toFa(poolCount)} مشتری`}
            </button>
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
