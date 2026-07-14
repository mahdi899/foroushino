import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, PauseCircle, CreditCard, Landmark } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { hasPermission } from '@/lib/permissions'
import { toFa } from '@/lib/format'
import { createAgent, suspendAgent, activateAgent, updateAgent } from '@/services/userAdminActions'
import { cn } from '@/lib/cn'
import type { Agent } from '@/types'

export function AgentManagementScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const pushToast = useStore((s) => s.pushToast)

  const canManage = hasPermission(permissions, 'users.manage-team') || hasPermission(permissions, 'users.manage')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Agent | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [teamId, setTeamId] = useState('')

  const roster = useMemo(() => agents.filter((a) => a.role === 'agent'), [agents])
  const pendingBankCount = useMemo(
    () => roster.filter((a) => a.bankCardMasked && a.bankShebaRegistered && !a.bankCardConfirmed).length,
    [roster],
  )

  if (!hasPermission(permissions, 'users.view')) return null

  const openCreate = () => {
    setName('')
    setPhone('')
    setTeamId(teams[0]?.id ?? '')
    setCreateOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setEditTarget(agent)
    setName(`${agent.firstName} ${agent.lastName}`.trim())
    setPhone(agent.phone ?? '')
    setTeamId(agent.teamId)
  }

  const submitCreate = async () => {
    try {
      await createAgent({ name, phone, teamId })
      pushToast('کارشناس اضافه شد')
      setCreateOpen(false)
    } catch {
      pushToast('افزودن کارشناس ناموفق بود', 'error')
    }
  }

  const submitEdit = async () => {
    if (!editTarget) return
    try {
      await updateAgent(editTarget.id, { name, phone, teamId })
      pushToast('پروفایل به‌روز شد')
      setEditTarget(null)
    } catch {
      pushToast('ویرایش ناموفق بود', 'error')
    }
  }

  const toggleActive = async (agent: Agent) => {
    try {
      if (agent.isActive === false) await activateAgent(agent.id)
      else await suspendAgent(agent.id)
      pushToast(agent.isActive === false ? 'کارشناس فعال شد' : 'کارشناس معلق شد')
    } catch {
      pushToast('عملیات ناموفق بود', 'error')
    }
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="مدیریت کارشناسان"
        subtitle={canManage ? 'افزودن، ویرایش و مشاهده وضعیت بانکی' : 'مشاهده کارشناسان'}
        icon={Users}
        iconTone="primary"
        action={
          canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-full bg-[#3390EC] px-3 py-2 text-[11px] font-bold text-white dark:bg-[#8774E1]"
            >
              افزودن
            </button>
          ) : undefined
        }
      />

      {canManage && pendingBankCount > 0 && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => navigate('/wallet/bank-accounts')}
            className="flex w-full items-center gap-3 rounded-[18px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-right"
          >
            <CreditCard size={18} className="shrink-0 text-amber-600" />
            <span className="flex-1 text-[12px] font-bold text-amber-800 dark:text-amber-300">
              {toFa(pendingBankCount)} کارشناس منتظر تایید کارت و شبا
            </span>
          </button>
        </div>
      )}

      <div className="space-y-2 px-4 pb-24 pt-3">
        {roster.map((agent) => {
          const team = teams.find((t) => t.id === agent.teamId)
          const bankPending = agent.bankCardMasked && agent.bankShebaRegistered && !agent.bankCardConfirmed
          return (
            <button
              key={agent.id}
              type="button"
              disabled={!canManage}
              onClick={() => canManage && openEdit(agent)}
              className="glass-card flex w-full items-center gap-3 rounded-[20px] border border-white/55 p-3.5 text-right dark:border-white/10 disabled:opacity-80"
            >
              <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={44} ring />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-text">
                  {agent.firstName} {agent.lastName}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
                  {team?.name ?? 'بدون تیم'} · {toFa(agent.callsToday)} تماس امروز
                </p>
                {agent.bankCardMasked && (
                  <p
                    className={cn(
                      'mt-1 flex items-center gap-1 text-[10px] font-semibold',
                      agent.bankCardConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    <CreditCard size={10} />
                    {toFa(agent.bankCardMasked)}
                    {agent.bankCardConfirmed ? ' · تایید شده' : bankPending ? ' · منتظر تایید' : ' · ناقص'}
                  </p>
                )}
                {agent.bankShebaRegistered && !agent.bankCardConfirmed && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-text-soft">
                    <Landmark size={10} />
                    شبا ثبت شده
                  </p>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void toggleActive(agent)
                  }}
                  className="rounded-full p-2 text-text-soft"
                  aria-label="تعلیق/فعال‌سازی"
                >
                  <PauseCircle size={18} />
                </button>
              )}
            </button>
          )
        })}
      </div>

      <AgentFormSheet
        open={createOpen}
        title="افزودن کارشناس"
        name={name}
        phone={phone}
        teamId={teamId}
        teams={teams}
        onName={setName}
        onPhone={setPhone}
        onTeam={setTeamId}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => void submitCreate()}
      />

      <AgentFormSheet
        open={!!editTarget}
        title="ویرایش کارشناس"
        name={name}
        phone={phone}
        teamId={teamId}
        teams={teams}
        onClose={() => setEditTarget(null)}
        onSubmit={() => void submitEdit()}
      />
    </Page>
  )
}

function AgentFormSheet({
  open,
  title,
  name,
  phone,
  teamId,
  teams,
  onName,
  onPhone,
  onTeam,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  name: string
  phone: string
  teamId: string
  teams: { id: string; name: string }[]
  onName: (v: string) => void
  onPhone: (v: string) => void
  onTeam: (v: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-3 pt-1">
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="نام و نام خانوادگی"
          className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
        />
        <input
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          placeholder="شماره موبایل"
          inputMode="tel"
          className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
        />
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <Chip key={team.id} active={teamId === team.id} onClick={() => onTeam(team.id)}>
              {team.name}
            </Chip>
          ))}
        </div>

        <Button full size="lg" icon={<UserPlus size={18} />} onClick={onSubmit}>
          ذخیره
        </Button>
      </div>
    </BottomSheet>
  )
}
