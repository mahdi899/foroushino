import { useMemo, useState } from 'react'
import { Users, UserPlus, Crown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { hasPermission } from '@/lib/permissions'
import { toFa } from '@/lib/format'
import { createTeam, updateTeam } from '@/services/teamAdminActions'
import type { Team } from '@/types'

export function TeamManagementScreen() {
  const permissions = useStore((s) => s.permissions)
  const teams = useStore((s) => s.teams)
  const agents = useStore((s) => s.agents)
  const pushToast = useStore((s) => s.pushToast)

  const canManage = hasPermission(permissions, 'teams.manage')
  const leaders = useMemo(() => agents.filter((agent) => agent.role === 'leader'), [agents])

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [leaderId, setLeaderId] = useState('')

  if (!canManage) return null

  const openCreate = () => {
    setName('')
    setLeaderId('')
    setCreateOpen(true)
  }

  const openEdit = (team: Team) => {
    setEditTarget(team)
    setName(team.name)
    setLeaderId(team.leaderId || '')
  }

  const submitCreate = async () => {
    if (!name.trim()) {
      pushToast('نام تیم را وارد کن', 'error')
      return
    }
    try {
      await createTeam({ name, leaderId: leaderId || undefined })
      pushToast('تیم ایجاد شد')
      setCreateOpen(false)
    } catch {
      pushToast('ایجاد تیم ناموفق بود', 'error')
    }
  }

  const submitEdit = async () => {
    if (!editTarget || !name.trim()) return
    try {
      await updateTeam(editTarget.id, {
        name,
        leaderId: leaderId || null,
      })
      pushToast('تیم به‌روز شد')
      setEditTarget(null)
    } catch {
      pushToast('ویرایش تیم ناموفق بود', 'error')
    }
  }

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name, 'fa')),
    [teams],
  )

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="مدیریت تیم‌ها"
        subtitle="ایجاد تیم و تعیین لیدر"
        icon={Users}
        iconTone="primary"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-[#3390EC] px-3 py-2 text-[11px] font-bold text-white dark:bg-[#8774E1]"
          >
            افزودن
          </button>
        }
      />

      <div className="space-y-2 px-4 pb-24 pt-3">
        {sortedTeams.map((team) => {
          const leaderAgent = agents.find((agent) => agent.id === team.leaderId)
          const leader =
            team.leaderName ??
            (leaderAgent ? `${leaderAgent.firstName} ${leaderAgent.lastName}`.trim() : null)
          const agentCount = team.agentsCount ?? team.agentIds.length
          const capacity = team.agentsCapacity ?? 5

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => openEdit(team)}
              className="glass-card flex w-full items-center gap-3 rounded-[20px] border border-white/55 p-3.5 text-right dark:border-white/10"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#3390EC]/12 text-[#3390EC] dark:bg-[#8774E1]/15 dark:text-[#8774E1]">
                <Users size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-text">{team.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-text-soft">
                  <Crown size={11} />
                  {leader ? `لیدر: ${leader}` : 'بدون لیدر'}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-text-muted">
                  {toFa(agentCount)} / {toFa(capacity)} کارشناس
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <TeamFormSheet
        open={createOpen}
        title="افزودن تیم"
        name={name}
        leaderId={leaderId}
        leaders={leaders}
        onName={setName}
        onLeader={setLeaderId}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => void submitCreate()}
      />

      <TeamFormSheet
        open={!!editTarget}
        title="ویرایش تیم"
        name={name}
        leaderId={leaderId}
        leaders={leaders}
        onName={setName}
        onLeader={setLeaderId}
        onClose={() => setEditTarget(null)}
        onSubmit={() => void submitEdit()}
      />
    </Page>
  )
}

function TeamFormSheet({
  open,
  title,
  name,
  leaderId,
  leaders,
  onName,
  onLeader,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  name: string
  leaderId: string
  leaders: { id: string; firstName: string; lastName: string }[]
  onName: (value: string) => void
  onLeader: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-3 pt-1">
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="نام تیم"
          className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
        />

        <div>
          <p className="mb-2 text-[11px] font-bold text-text-soft">لیدر تیم (اختیاری)</p>
          <div className="flex flex-wrap gap-2">
            <Chip active={!leaderId} onClick={() => onLeader('')}>
              بدون لیدر
            </Chip>
            {leaders.map((leader) => (
              <Chip
                key={leader.id}
                active={leaderId === leader.id}
                onClick={() => onLeader(leader.id)}
              >
                {leader.firstName} {leader.lastName}
              </Chip>
            ))}
          </div>
        </div>

        <Button full size="lg" icon={<UserPlus size={18} />} onClick={onSubmit}>
          ذخیره
        </Button>
      </div>
    </BottomSheet>
  )
}
