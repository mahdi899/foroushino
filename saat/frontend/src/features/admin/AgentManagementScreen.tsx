import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, PauseCircle, CreditCard, Landmark, Search } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { AgentDetailSheet } from '@/components/domain/AgentDetailSheet'
import { Avatar } from '@/components/ui/Avatar'
import { hasPermission } from '@/lib/permissions'
import { toFa, toEn } from '@/lib/format'
import { createAgent, suspendAgent, activateAgent, updateAgent, ensureAdminAgentsLoaded } from '@/services/userAdminActions'
import { clearBankAccount } from '@/services/walletActions'
import { EmptyState } from '@/components/ui/States'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [teamId, setTeamId] = useState('')

  const roster = useMemo(() => agents.filter((a) => a.role === 'agent'), [agents])
  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return roster

    const needleEn = toEn(q).toLowerCase()

    return roster.filter((agent) => {
      const fullName = `${agent.firstName} ${agent.lastName}`.trim()
      const teamName = teams.find((t) => t.id === agent.teamId)?.name ?? 'بدون تیم'
      const phoneDigits = toEn(agent.phone ?? '')

      return (
        fullName.includes(q) ||
        agent.firstName.includes(q) ||
        agent.lastName.includes(q) ||
        teamName.includes(q) ||
        (phoneDigits && (phoneDigits.includes(needleEn) || (agent.phone ?? '').includes(q)))
      )
    })
  }, [roster, searchQuery, teams])
  const pendingBankCount = useMemo(
    () =>
      roster.filter(
        (a) => (a.bankCard || a.bankCardMasked) && a.bankShebaRegistered && !a.bankCardConfirmed,
      ).length,
    [roster],
  )
  const canView = hasPermission(permissions, 'users.view')

  useEffect(() => {
    if (!canView) return
    void ensureAdminAgentsLoaded().catch(() => {
      pushToast('بارگذاری کارشناسان ناموفق بود', 'error')
    })
  }, [canView, pushToast])

  if (!canView) return null

  const openCreate = () => {
    setName('')
    setPhone('')
    setTeamId(teams[0]?.id ?? '')
    setCreateOpen(true)
  }

  const openEdit = (agent: Agent) => {
    const fresh = agents.find((a) => a.id === agent.id) ?? agent
    setEditTarget(fresh)
    setName(`${fresh.firstName} ${fresh.lastName}`.trim())
    setPhone(fresh.phone ?? '')
    setTeamId(fresh.teamId)
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

  const clearAgentBank = async (agent: Agent) => {
    try {
      const updated = await clearBankAccount(agent.id)
      useStore.getState().upsertAgent(updated)
      if (editTarget?.id === agent.id) {
        setEditTarget(updated)
      }
      pushToast('اطلاعات بانکی حذف شد')
    } catch {
      pushToast('حذف اطلاعات بانکی ناموفق بود', 'error')
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
        <div className="glass-inset flex items-center gap-2 rounded-[14px] border border-white/55 px-3 py-2.5 dark:border-white/10">
          <Search size={16} className="shrink-0 text-text-soft" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی کارشناس..."
            className="w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:text-text-muted"
          />
        </div>

        {filteredRoster.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title="کارشناسی پیدا نشد"
            description={searchQuery.trim() ? 'نام، تیم یا شماره دیگری را جستجو کن.' : 'هنوز کارشناسی ثبت نشده.'}
          />
        ) : (
          filteredRoster.map((agent) => {
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
        })
        )}
      </div>

      <AgentDetailSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="افزودن کارشناس"
        teams={teams}
        canEdit
        name={name}
        phone={phone}
        teamId={teamId}
        onName={setName}
        onPhone={setPhone}
        onTeam={setTeamId}
        onSubmit={() => void submitCreate()}
        pushToast={pushToast}
      />

      <AgentDetailSheet
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="ویرایش کارشناس"
        agent={editTarget}
        teams={teams}
        canEdit
        showFinance
        name={name}
        phone={phone}
        teamId={teamId}
        canViewBank={canManage}
        canClearBank={canManage}
        onClearBank={() => editTarget && void clearAgentBank(editTarget)}
        onName={setName}
        onPhone={setPhone}
        onTeam={setTeamId}
        onSubmit={() => void submitEdit()}
        pushToast={pushToast}
      />
    </Page>
  )
}
