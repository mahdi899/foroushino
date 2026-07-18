import { useEffect, useMemo, useState } from 'react'
import { Check, Download, Save, X } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import type { TeamReport, TeamReportAgentEntry } from '@/types'
import {
  buildTeamReportNarrative,
  effectiveAgentMetrics,
  exportTeamReportCsv,
  formatAgentReportLine,
  sortAgentEntries,
} from '@/lib/teamDailyReport'
import { cn } from '@/lib/cn'
import { toFa } from '@/lib/format'

type TeamReportReviewSheetProps = {
  report: TeamReport | null
  open: boolean
  onClose: () => void
  onSave: (payload: {
    supervisorNotes: string
    agents: TeamReportAgentEntry[]
    narrative: string
  }) => Promise<void>
  onApprove?: () => void
}

export function TeamReportReviewSheet({
  report,
  open,
  onClose,
  onSave,
  onApprove,
}: TeamReportReviewSheetProps) {
  const [supervisorNotes, setSupervisorNotes] = useState('')
  const [entries, setEntries] = useState<TeamReportAgentEntry[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !report) return
    setSupervisorNotes(report.supervisorNotes ?? '')
    setEntries(sortAgentEntries(report.summary.agents ?? []))
  }, [open, report])

  const narrative = useMemo(() => buildTeamReportNarrative(entries), [entries])

  const updateEntry = (agentId: string, patch: TeamReportAgentEntry['display']) => {
    setEntries((rows) =>
      rows.map((row) =>
        row.agent_id === agentId ? { ...row, display: { ...row.display, ...patch } } : row,
      ),
    )
  }

  const setReviewStatus = (agentId: string, review_status: TeamReportAgentEntry['review_status']) => {
    setEntries((rows) => rows.map((row) => (row.agent_id === agentId ? { ...row, review_status } : row)))
  }

  const handleSave = async () => {
    if (!report) return
    setBusy(true)
    try {
      await onSave({ supervisorNotes: supervisorNotes.trim(), agents: entries, narrative })
    } finally {
      setBusy(false)
    }
  }

  if (!report) return null

  return (
    <BottomSheet open={open} onClose={onClose} title={`بررسی گزارش ${report.teamName}`} className="max-h-[92%]">
      <div className="space-y-4 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="تماس" value={toFa(report.summary.calls_today)} />
          <Stat label="موفق" value={toFa(report.summary.successful_today)} />
          <Stat label="تبدیل" value={`${toFa(report.summary.conversion_rate)}٪`} />
        </div>

        {report.leaderNotes ? (
          <p className="rounded-[14px] bg-black/[0.04] px-3 py-2 text-[12px] font-semibold text-text-soft dark:bg-white/6">
            یادداشت لیدر: {report.leaderNotes}
          </p>
        ) : null}

        <div className="space-y-2">
          {entries.map((entry) => {
            const metrics = effectiveAgentMetrics(entry)
            const edited = Boolean(entry.display && Object.keys(entry.display).length > 0)
            return (
              <div
                key={entry.agent_id}
                className="glass-card space-y-2 rounded-[16px] border border-white/55 p-3 dark:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-text">{entry.agent_name}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-text-soft">
                      {formatAgentReportLine(entry)}
                    </p>
                    {edited ? (
                      <p className="mt-1 text-[10px] font-bold text-amber-700">
                        ویرایش شده — اصلی: {toFa(entry.source?.calls_today ?? 0)} تماس ·{' '}
                        {toFa(entry.source?.conversion_rate ?? 0)}٪
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-1 text-[10px] font-bold',
                      entry.review_status === 'approved' && 'bg-emerald-500/15 text-emerald-700',
                      entry.review_status === 'rejected' && 'bg-error-500/15 text-error-700',
                      (!entry.review_status || entry.review_status === 'pending') &&
                        'bg-amber-500/15 text-amber-700',
                    )}
                  >
                    {entry.review_status === 'approved'
                      ? 'تایید'
                      : entry.review_status === 'rejected'
                        ? 'رد'
                        : 'بررسی'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MiniField
                    label="تماس"
                    value={String(metrics.calls_today)}
                    onChange={(value) => updateEntry(entry.agent_id, { calls_today: Number(value) || 0 })}
                  />
                  <MiniField
                    label="موفق"
                    value={String(metrics.successful_today)}
                    onChange={(value) =>
                      updateEntry(entry.agent_id, { successful_today: Number(value) || 0 })
                    }
                  />
                  <MiniField
                    label="پورسانت"
                    value={String(metrics.commission_today)}
                    onChange={(value) =>
                      updateEntry(entry.agent_id, { commission_today: Number(value) || 0 })
                    }
                  />
                </div>

                <input
                  value={entry.display?.note ?? ''}
                  onChange={(e) => updateEntry(entry.agent_id, { note: e.target.value })}
                  placeholder="یادداشت ناظر برای این کارشناس"
                  className="glass-inset w-full rounded-[12px] border border-white/50 px-3 py-2 text-[12px] font-semibold text-text outline-none dark:border-white/10"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus(entry.agent_id, 'approved')}
                    className="flex flex-1 items-center justify-center gap-1 rounded-[12px] bg-emerald-500/12 py-2 text-[11px] font-bold text-emerald-700"
                  >
                    <Check size={13} />
                    تایید
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus(entry.agent_id, 'rejected')}
                    className="flex flex-1 items-center justify-center gap-1 rounded-[12px] bg-error-500/12 py-2 text-[11px] font-bold text-error-700"
                  >
                    <X size={13} />
                    رد
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <label className="block">
          <span className="mb-1 block text-[12px] font-bold text-text-soft">یادداشت ناظر</span>
          <textarea
            value={supervisorNotes}
            onChange={(e) => setSupervisorNotes(e.target.value)}
            rows={3}
            className="glass-inset w-full resize-none rounded-[14px] border border-white/50 px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-text outline-none dark:border-white/10"
          />
        </label>

        <div className="glass-inset rounded-[14px] border border-white/50 p-3 dark:border-white/10">
          <p className="mb-2 text-[11px] font-bold text-text-soft">خلاصه نهایی</p>
          <pre className="whitespace-pre-wrap text-[11px] font-semibold leading-relaxed text-text-muted">
            {narrative}
          </pre>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="soft"
            size="lg"
            icon={<Download size={15} />}
            onClick={() => exportTeamReportCsv({ ...report, supervisorNotes, summary: { ...report.summary, agents: entries, narrative } })}
          >
            خروجی اکسل
          </Button>
          <Button size="lg" icon={<Save size={15} />} disabled={busy} onClick={() => void handleSave()}>
            {busy ? 'ذخیره…' : 'ذخیره ویرایش'}
          </Button>
        </div>

        {onApprove && report.status === 'submitted' ? (
          <Button full size="lg" icon={<Check size={16} />} onClick={onApprove}>
            تایید کل گزارش
          </Button>
        ) : null}
      </div>
    </BottomSheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-black/[0.04] px-2 py-2 text-center dark:bg-white/6">
      <p className="text-[10px] font-semibold text-text-soft">{label}</p>
      <p className="text-[13px] font-black tabular-nums text-text">{value}</p>
    </div>
  )
}

function MiniField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-bold text-text-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="glass-inset w-full rounded-[10px] border border-white/50 px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-text outline-none dark:border-white/10"
      />
    </label>
  )
}
