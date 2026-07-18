import { useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import type { Team, TeamReportAgentEntry, TeamReportSummary } from '@/types'
import {
  buildTeamReportDraft,
  buildTeamReportNarrative,
  effectiveAgentMetrics,
  formatAgentReportLine,
  sortAgentEntries,
} from '@/lib/teamDailyReport'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/cn'
import { toFa } from '@/lib/format'

type TeamReportComposeSheetProps = {
  open: boolean
  team: Team | null
  onClose: () => void
  onSubmit: (payload: { leaderNotes: string; summary: TeamReportSummary }) => Promise<void>
}

export function TeamReportComposeSheet({ open, team, onClose, onSubmit }: TeamReportComposeSheetProps) {
  const agents = useStore((s) => s.agents)
  const commissions = useStore((s) => s.commissions)
  const sales = useStore((s) => s.sales)
  const [leaderNotes, setLeaderNotes] = useState('')
  const [entries, setEntries] = useState<TeamReportAgentEntry[]>([])
  const [busy, setBusy] = useState(false)

  const draft = useMemo(() => {
    if (!open || !team) return null
    return buildTeamReportDraft({ team, agents, commissions, sales })
  }, [open, team, agents, commissions, sales])

  useEffect(() => {
    if (!open || !draft) return
    setEntries(sortAgentEntries(draft.agents ?? []))
    setLeaderNotes('')
  }, [open, draft])

  const narrative = useMemo(() => buildTeamReportNarrative(entries), [entries])

  const updateEntry = (agentId: string, patch: TeamReportAgentEntry['display']) => {
    setEntries((rows) =>
      rows.map((row) => {
        if (row.agent_id !== agentId) return row
        const nextDisplay = { ...row.display, ...patch }
        const calls = nextDisplay.calls_today ?? row.source.calls_today
        const successful = nextDisplay.successful_today ?? row.source.successful_today
        if (patch?.calls_today !== undefined || patch?.successful_today !== undefined) {
          nextDisplay.conversion_rate =
            calls > 0 ? Math.round((successful / calls) * 1000) / 10 : 0
        }
        return { ...row, display: nextDisplay }
      }),
    )
  }

  const handleSubmit = async () => {
    if (!draft || !team) return
    setBusy(true)
    try {
      const summary: TeamReportSummary = {
        ...draft,
        agents: entries,
        narrative,
      }
      await onSubmit({ leaderNotes: leaderNotes.trim(), summary })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="ارسال گزارش امروز" className="max-h-[92%]">
      {!team || !draft ? (
        <p className="py-6 text-center text-[13px] font-semibold text-text-soft">تیمی برای گزارش پیدا نشد.</p>
      ) : (
        <div className="space-y-4 pb-2">
          <p className="text-[12px] font-semibold leading-relaxed text-text-muted">
            خلاصه فعالیت کارشناسان تیم {team.name} — مرتب‌شده بر اساس درصد موفقیت تماس.
          </p>

          <div className="space-y-2">
            {entries.map((entry) => {
              const metrics = effectiveAgentMetrics(entry)
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
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-bold text-primary-700">
                      {toFa(metrics.conversion_rate)}٪
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MetricField
                      label="تماس"
                      value={String(metrics.calls_today)}
                      onChange={(value) =>
                        updateEntry(entry.agent_id, { calls_today: Number(value) || 0 })
                      }
                    />
                    <MetricField
                      label="موفق"
                      value={String(metrics.successful_today)}
                      onChange={(value) =>
                        updateEntry(entry.agent_id, { successful_today: Number(value) || 0 })
                      }
                    />
                    <MetricField
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
                    placeholder="یادداشت این کارشناس (اختیاری)"
                    className="glass-inset w-full rounded-[12px] border border-white/50 px-3 py-2 text-[12px] font-semibold text-text outline-none dark:border-white/10"
                  />
                </div>
              )
            })}
          </div>

          <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-text-soft">یادداشت کلی تیم</span>
            <textarea
              value={leaderNotes}
              onChange={(e) => setLeaderNotes(e.target.value)}
              rows={3}
              placeholder="خلاصه عملکرد تیم امروز…"
              className="glass-inset w-full resize-none rounded-[14px] border border-white/50 px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-text outline-none dark:border-white/10"
            />
          </label>

          <div className="glass-inset rounded-[14px] border border-white/50 p-3 dark:border-white/10">
            <p className="mb-2 text-[11px] font-bold text-text-soft">پیش‌نمایش متن گزارش</p>
            <pre className="whitespace-pre-wrap text-[11px] font-semibold leading-relaxed text-text-muted">
              {narrative}
            </pre>
          </div>

          <Button full size="lg" icon={<Send size={16} />} disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? 'در حال ارسال…' : 'ارسال برای ناظر'}
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}

function MetricField({
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
        className={cn(
          'glass-inset w-full rounded-[10px] border border-white/50 px-2 py-1.5 text-center text-[12px] font-bold tabular-nums text-text',
          'outline-none dark:border-white/10',
        )}
      />
    </label>
  )
}
