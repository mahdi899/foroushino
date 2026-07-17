import { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { toEn, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Team } from '@/types'

type SupervisorTeamsSheetProps = {
  open: boolean
  supervisorName: string
  editingSupervisorId: string | null
  teams: Team[]
  selectedTeamIds: string[]
  capacity: number
  onChange: (teamIds: string[]) => void
  onClose: () => void
  onSubmit: () => void
  busy?: boolean
}

export function SupervisorTeamsSheet({
  open,
  supervisorName,
  editingSupervisorId,
  teams,
  selectedTeamIds,
  capacity,
  onChange,
  onClose,
  onSubmit,
  busy,
}: SupervisorTeamsSheetProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return teams
    const needleEn = toEn(q).toLowerCase()
    return teams.filter((team) => {
      const supervisor = team.supervisorName ?? ''
      return team.name.includes(q) || supervisor.includes(q) || team.id.includes(needleEn)
    })
  }, [query, teams])

  const toggleTeam = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      onChange(selectedTeamIds.filter((id) => id !== teamId))
      return
    }
    if (selectedTeamIds.length >= capacity) return
    onChange([...selectedTeamIds, teamId])
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`تیم‌های ${supervisorName}`}>
      <div className="space-y-3 pt-1">
        <p className="text-[11px] font-semibold leading-5 text-text-soft">
          حداکثر {toFa(capacity)} تیم برای هر ناظر. تیم‌های انتخاب‌شده تحت نظارت این ناظر قرار می‌گیرند.
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-text-soft">تیم‌های انتخاب‌شده</span>
          <span className="text-[10px] font-black tabular-nums text-text">
            {toFa(selectedTeamIds.length)} / {toFa(capacity)}
          </span>
        </div>

        <div className="glass-inset flex items-center gap-2 rounded-[14px] border border-white/55 px-3 py-2.5 dark:border-white/10">
          <Search size={15} className="shrink-0 text-text-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی تیم…"
            className="w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:text-text-muted"
          />
        </div>

        <div className="max-h-[280px] space-y-1.5 overflow-y-auto no-scrollbar">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[12px] font-semibold text-text-soft">تیمی پیدا نشد</p>
          ) : (
            filtered.map((team) => {
              const selected = selectedTeamIds.includes(team.id)
              const ownedElsewhere =
                team.supervisorId != null &&
                team.supervisorId !== editingSupervisorId &&
                team.supervisorName &&
                !selected
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-right transition-colors',
                    selected
                      ? 'border-[#3390EC]/35 bg-[#3390EC]/10 dark:border-[#8774E1]/35 dark:bg-[#8774E1]/12'
                      : 'border-white/55 bg-white/20 dark:border-white/10 dark:bg-white/5',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-text">{team.name}</p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-text-soft">
                      {ownedElsewhere
                        ? `ناظر فعلی: ${team.supervisorName}`
                        : `${toFa(team.agentsCount ?? team.agentIds.length)} کارشناس`}
                    </p>
                  </div>
                  {selected && <Check size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />}
                </button>
              )
            })
          )}
        </div>

        <Button full size="lg" disabled={busy} onClick={onSubmit}>
          {busy ? 'در حال ذخیره…' : 'ذخیره تیم‌ها'}
        </Button>
      </div>
    </BottomSheet>
  )
}
