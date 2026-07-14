import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  PhoneCall,
  Users,
  Radio,
  ArrowLeft,
  BadgeDollarSign,
  ClipboardList,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Avatar } from '@/components/ui/Avatar'
import { availabilityLabels, resultLabels } from '@/data/labels'
import { availabilityDotClass } from '@/components/domain/icons'
import {
  agentById,
  getManagedTeam,
  getTeamAgentIds,
  leadById,
  teamCallsToday,
} from '@/lib/teamUtils'
import { formatDuration, relativeDayTime, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'
import { isLeaderRole, hasMultiTeamView } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

export function TeamLiveScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedTeamId = searchParams.get('teamId')
  const role = useStore((s) => s.role)
  const permissions = useStore((s) => s.permissions)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const leads = useStore((s) => s.leads)
  const calls = useStore((s) => s.calls)
  const sales = useStore((s) => s.sales)
  const activeCallLeadId = useStore((s) => s.activeCallLeadId)
  const availability = useStore((s) => s.availability)

  const [, setTick] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 10_000)
    return () => clearInterval(timer)
  }, [])

  const team = useMemo(() => {
    if (selectedTeamId && hasMultiTeamView(role)) {
      return teams.find((t) => t.id === selectedTeamId) ?? null
    }
    return getManagedTeam(teams, currentAgentId, role)
  }, [selectedTeamId, teams, currentAgentId, role])

  const teamAgentIds = useMemo(() => {
    if (team) return team.agentIds
    return getTeamAgentIds(teams, agents, currentAgentId, role)
  }, [team, teams, agents, currentAgentId, role])
  const members = useMemo(
    () => agents.filter((agent) => teamAgentIds.includes(agent.id)),
    [agents, teamAgentIds],
  )

  const recentCalls = useMemo(
    () => teamCallsToday(calls, teams, agents, currentAgentId, role).slice(0, 20),
    [calls, teams, agents, currentAgentId, role],
  )

  const paymentReviewCount = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.status === 'payment_submitted' && teamAgentIds.includes(sale.agentId),
      ).length,
    [sales, teamAgentIds],
  )

  const onlineCount = useMemo(() => {
    return members.filter((member) => {
      if (member.id === currentAgentId) {
        return availability !== 'offline'
      }
      return member.callsToday > 0
    }).length
  }, [members, currentAgentId, availability])

  const canReviewPayments = hasPermission(permissions, 'sales.review-payment')

  return (
    <Page>
      <ScreenHeader
        sticky
        title={team ? team.name : 'تیم من'}
        subtitle={isLeaderRole(role) ? 'نظارت لایو بر کارشناسان' : 'وضعیت لحظه‌ای تیم'}
        icon={Users}
        iconTone="primary"
      />

      <div className="space-y-5 px-4 pb-6 pt-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="glass-hero rounded-[24px] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-text-soft">کارشناسان فعال امروز</p>
              <p className="mt-1 text-[28px] font-black tabular-nums text-text">
                {toFa(onlineCount)}
                <span className="text-[14px] font-bold text-text-soft"> / {toFa(members.length)}</span>
              </p>
            </div>
            <span className="glass-inset inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold text-text-muted">
              <Radio size={12} className="text-emerald-500" />
              لایو
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <ClipboardList size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />
              <span className="text-[12px] font-bold text-text">بررسی سرنخ‌ها</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/sales?status=payment_submitted')}
              className="glass-inset flex items-center gap-2 rounded-[16px] border px-3 py-3 text-right"
            >
              <BadgeDollarSign size={16} className="shrink-0 text-warning-600" />
              <span className="text-[12px] font-bold text-text">
                پرداخت‌ها
                {paymentReviewCount > 0 ? ` (${toFa(paymentReviewCount)})` : ''}
              </span>
            </button>
          </div>
        </motion.div>

        <section>
          <h2 className="mb-3 text-[15px] font-extrabold text-text">کارشناسان تیم</h2>
          <div className="space-y-2.5">
            {members.map((member) => {
              const isSelf = member.id === currentAgentId
              const memberAvailability = isSelf
                ? availability
                : member.callsToday > 0
                  ? 'available'
                  : 'offline'
              const inCallLead = isSelf ? leadById(leads, activeCallLeadId ?? '') : undefined

              return (
                <div
                  key={member.id}
                  className="glass-card flex items-center gap-3 rounded-[20px] border border-white/55 p-3.5 dark:border-white/10"
                >
                  <Avatar
                    id={member.id}
                    first={member.firstName}
                    last={member.lastName}
                    src={member.avatar}
                    size={46}
                    ring
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-text">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-text-soft">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          availabilityDotClass[memberAvailability],
                        )}
                      />
                      {availabilityLabels[memberAvailability]}
                      {inCallLead ? ` · ${inCallLead.firstName} ${inCallLead.lastName}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-[13px] font-black tabular-nums text-text">
                      {toFa(member.callsToday)}
                    </p>
                    <p className="text-[10px] font-semibold text-text-soft">تماس امروز</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-text">
              <PhoneCall size={16} className="text-[#3390EC] dark:text-[#8774E1]" />
              تماس‌های امروز تیم
            </h2>
            <span className="text-[11px] font-bold text-text-soft">{toFa(recentCalls.length)} مورد</span>
          </div>

          {recentCalls.length === 0 ? (
            <div className="glass-inset rounded-[18px] border px-4 py-8 text-center text-[13px] font-semibold text-text-soft">
              هنوز تماسی از تیم ثبت نشده
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call) => {
                const agent = agentById(agents, call.agentId)
                const lead = leadById(leads, call.leadId)
                return (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => lead && navigate(`/leads/${lead.id}`)}
                    className="glass-card flex w-full items-center gap-3 rounded-[18px] border border-white/55 p-3.5 text-right dark:border-white/10"
                  >
                    <span className="icon-3d icon-3d-primary flex h-10 w-10 shrink-0 items-center justify-center">
                      <Phone size={16} className="text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-text">
                        {agent ? `${agent.firstName} ${agent.lastName}` : 'کارشناس'}
                        <span className="text-text-soft"> → </span>
                        {lead ? `${lead.firstName} ${lead.lastName}` : 'سرنخ'}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-text-soft">
                        {resultLabels[call.result]} · {formatDuration(call.durationSec)} ·{' '}
                        {relativeDayTime(call.createdAt)}
                      </p>
                    </div>
                    <ArrowLeft size={14} className="shrink-0 text-text-soft" />
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {canReviewPayments && paymentReviewCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/sales?status=payment_submitted')}
            className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-warning-500 px-4 py-3.5 text-[13px] font-extrabold text-white"
          >
            <BadgeDollarSign size={16} />
            {toFa(paymentReviewCount)} پرداخت منتظر بررسی لیدر
          </button>
        )}
      </div>
    </Page>
  )
}
