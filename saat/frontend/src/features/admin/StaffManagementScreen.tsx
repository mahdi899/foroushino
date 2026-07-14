import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronLeft } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Avatar } from '@/components/ui/Avatar'
import { roleLabels } from '@/data/labels'
import { hasPermission } from '@/lib/permissions'
import { toFa } from '@/lib/format'
import type { Role } from '@/types'

const STAFF_ROLES: Role[] = ['supervisor', 'leader']

export function StaffManagementScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)

  const canManage = hasPermission(permissions, 'users.manage')

  const staff = useMemo(
    () => agents.filter((agent) => STAFF_ROLES.includes(agent.role)),
    [agents],
  )

  const supervisors = staff.filter((a) => a.role === 'supervisor')
  const leaders = staff.filter((a) => a.role === 'leader')

  if (!hasPermission(permissions, 'users.view')) {
    return null
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="مدیریت ناظران"
        subtitle={canManage ? 'ناظران، لیدرها و تیم‌ها' : 'مشاهده ناظران و لیدرها'}
        icon={Shield}
        iconTone="primary"
      />

      <div className="space-y-5 px-4 pb-24 pt-2">
        <section>
          <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">
            سوپروایزرها ({toFa(supervisors.length)})
          </h2>
          <div className="space-y-2">
            {supervisors.map((person) => {
              const team = teams.find((t) => t.id === person.teamId)
              return (
                <StaffRow
                  key={person.id}
                  person={person}
                  teamName={team?.name}
                  onOpenTeams={() => navigate('/teams')}
                />
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[15px] font-extrabold text-neutral-900">
            لیدرهای تیم ({toFa(leaders.length)})
          </h2>
          <div className="space-y-2">
            {leaders.map((person) => {
              const team = teams.find((t) => t.leaderId === person.id)
              return (
                <StaffRow
                  key={person.id}
                  person={person}
                  teamName={team?.name}
                  onOpenTeams={() => team && navigate(`/team?teamId=${team.id}`)}
                />
              )
            })}
          </div>
        </section>

        {canManage && (
          <p className="rounded-2xl bg-primary-50 p-4 text-[12px] font-semibold leading-6 text-primary-700">
            ویرایش نقش‌ها و تیم‌ها از پنل ادمین وب در دسترس است. در موبایل فعلاً مشاهده و
            نظارت لایو فعال است.
          </p>
        )}
      </div>
    </Page>
  )
}

function StaffRow({
  person,
  teamName,
  onOpenTeams,
}: {
  person: { id: string; firstName: string; lastName: string; role: Role; avatar?: string | null; callsToday: number }
  teamName?: string
  onOpenTeams: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpenTeams}
      className="glass-card flex w-full items-center gap-3 rounded-[20px] border border-white/55 p-3.5 text-right dark:border-white/10"
    >
      <Avatar
        id={person.id}
        first={person.firstName}
        last={person.lastName}
        src={person.avatar}
        size={46}
        ring
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-text">
          {person.firstName} {person.lastName}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
          {roleLabels[person.role]}
          {teamName ? ` · ${teamName}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-[12px] font-black tabular-nums text-text">{toFa(person.callsToday)}</p>
        <p className="text-[10px] font-semibold text-text-soft">تماس امروز</p>
      </div>
      <ChevronLeft size={14} className="shrink-0 text-text-soft" />
    </button>
  )
}
