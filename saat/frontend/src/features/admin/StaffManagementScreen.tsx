import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronLeft, UserPlus, Crown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { roleLabels } from '@/data/labels'
import { hasPermission } from '@/lib/permissions'
import { isSuperAdminRole } from '@/lib/roles'
import { apiErrorMessage } from '@/lib/apiErrors'
import { isManagerRole } from '@/lib/roles'
import { toFa } from '@/lib/format'
import { createStaff, ensureAdminAgentsLoaded } from '@/services/userAdminActions'
import { refreshTeamsFromAdmin } from '@/services/teamAdminActions'
import type { Role } from '@/types'

const STAFF_ROLES: Role[] = ['supervisor', 'leader']

export function StaffManagementScreen() {
  const navigate = useNavigate()
  const permissions = useStore((s) => s.permissions)
  const role = useStore((s) => s.role)
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const pushToast = useStore((s) => s.pushToast)

  const canManage = hasPermission(permissions, 'users.manage')
  const canCreateLeader = canManage || hasPermission(permissions, 'users.manage-team')
  const leaderTeamOptional = isManagerRole(role)

  const [createRole, setCreateRole] = useState<'supervisor' | 'leader' | 'super-admin' | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamId, setTeamId] = useState('')
  const [busy, setBusy] = useState(false)

  const staff = useMemo(
    () => agents.filter((agent) => STAFF_ROLES.includes(agent.role)),
    [agents],
  )

  const supervisors = staff.filter((a) => a.role === 'supervisor')
  const leaders = staff.filter((a) => a.role === 'leader')

  const supervisedTeams = useMemo(() => {
    const map = new Map<string, typeof teams>()
    for (const team of teams) {
      const key = team.supervisorId ?? '__none__'
      const bucket = map.get(key) ?? []
      bucket.push(team)
      map.set(key, bucket)
    }
    return map
  }, [teams])

  useEffect(() => {
    if (!hasPermission(permissions, 'users.view')) return
    void Promise.all([
      ensureAdminAgentsLoaded(),
      refreshTeamsFromAdmin(),
    ]).catch(() => {
      pushToast('بارگذاری پرسنل ناموفق بود', 'error')
    })
  }, [permissions, pushToast])

  if (!hasPermission(permissions, 'users.view')) {
    return null
  }

  const openCreate = (nextRole: 'supervisor' | 'leader' | 'super-admin') => {
    setCreateRole(nextRole)
    setName('')
    setPhone('')
    setEmail('')
    setPassword('')
    setTeamId(nextRole === 'leader' && leaderTeamOptional ? '' : (teams[0]?.id ?? ''))
  }

  const submitCreate = async () => {
    if (!createRole || !name.trim() || !phone.trim()) {
      pushToast('نام و شماره موبایل را وارد کن', 'error')
      return
    }
    if (createRole === 'leader' && !leaderTeamOptional && !teamId) {
      pushToast('تیم سرتیم را انتخاب کن', 'error')
      return
    }
    if (createRole === 'leader' && !leaderTeamOptional && teams.length === 0) {
      pushToast('ابتدا یک تیم بساز، بعد سرتیم را اضافه کن', 'error')
      return
    }
    if (createRole === 'super-admin') {
      if (!email.trim() || password.length < 12) {
        pushToast('ایمیل و رمز (حداقل ۱۲ کاراکتر) الزامی است', 'error')
        return
      }
    } else if (password.length < 12) {
      pushToast('رمز عبور اولیه (حداقل ۱۲ کاراکتر) الزامی است', 'error')
      return
    }

    setBusy(true)
    try {
      await createStaff({
        name,
        phone,
        role: createRole,
        teamId: createRole === 'leader' && teamId ? teamId : undefined,
        email: createRole === 'super-admin' ? email.trim() : undefined,
        password,
      })
      if (createRole === 'leader') {
        await refreshTeamsFromAdmin(true)
      }
      pushToast(
        createRole === 'supervisor'
          ? 'ناظر اضافه شد'
          : createRole === 'leader'
            ? 'سرتیم اضافه شد'
            : 'مدیر کل اضافه شد',
      )
      setCreateRole(null)
    } catch (error) {
      pushToast(apiErrorMessage(error, 'افزودن پرسنل ناموفق بود'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page withNav={false}>
      <ScreenHeader
        sticky
        showBack
        title="مدیریت ناظران"
        subtitle={canManage ? 'تعریف ناظر، سرتیم و تیم‌ها' : 'مشاهده ناظران و سرتیم‌ها'}
        icon={Shield}
        iconTone="primary"
      />

      <div className="space-y-5 px-4 pb-24 pt-2">
        {isSuperAdminRole(role) && (
          <section className="glass-card rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-extrabold text-text">مدیران کل</h2>
              <button
                type="button"
                onClick={() => openCreate('super-admin')}
                className="flex items-center gap-1 rounded-full bg-[#3390EC] px-3 py-1.5 text-[10px] font-bold text-white dark:bg-[#8774E1]"
              >
                <Crown size={12} />
                مدیر کل جدید
              </button>
            </div>
            <p className="text-[12px] leading-6 text-text-soft">
              مدیر کل با رمز عبور وارد می‌شود و به همه بخش‌ها دسترسی دارد.
            </p>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-extrabold text-text">
              ناظران ({toFa(supervisors.length)})
            </h2>
            {canManage && (
              <button
                type="button"
                onClick={() => openCreate('supervisor')}
                className="flex items-center gap-1 rounded-full bg-[#3390EC] px-3 py-1.5 text-[10px] font-bold text-white dark:bg-[#8774E1]"
              >
                <UserPlus size={12} />
                افزودن ناظر
              </button>
            )}
          </div>
          <div className="space-y-2">
            {supervisors.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-white/55 px-4 py-5 text-center text-[12px] font-semibold text-text-soft dark:border-white/10">
                هنوز ناظری ثبت نشده
              </p>
            ) : (
              supervisors.map((person) => {
                const assignedTeams =
                  supervisedTeams.get(person.id)?.sort((a, b) => a.name.localeCompare(b.name, 'fa')) ?? []
                return (
                  <StaffRow
                    key={person.id}
                    person={person}
                    meta={
                      assignedTeams.length > 0
                        ? `${toFa(assignedTeams.length)} تیم: ${assignedTeams.map((team) => team.name).join('، ')}`
                        : 'بدون تیم تحت نظارت'
                    }
                    onOpen={() => navigate('/teams')}
                  />
                )
              })
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-extrabold text-text">
              سرتیم‌ها ({toFa(leaders.length)})
            </h2>
            {canCreateLeader && (
              <button
                type="button"
                onClick={() => openCreate('leader')}
                className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white"
              >
                <Crown size={12} />
                افزودن سرتیم
              </button>
            )}
          </div>
          <div className="space-y-2">
            {leaders.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-white/55 px-4 py-5 text-center text-[12px] font-semibold text-text-soft dark:border-white/10">
                هنوز سرتیمی ثبت نشده
              </p>
            ) : (
              leaders.map((person) => {
                const team = teams.find((t) => t.leaderId === person.id)
                const supervisorName = team?.supervisorName
                return (
                  <StaffRow
                    key={person.id}
                    person={person}
                    meta={
                      team
                        ? `تیم ${team.name}${supervisorName ? ` · ناظر ${supervisorName}` : ''}`
                        : 'بدون تیم'
                    }
                    onOpen={() => (team ? navigate(`/team?teamId=${team.id}`) : navigate('/teams'))}
                  />
                )
              })
            )}
          </div>
        </section>

        {canManage && (
          <button
            type="button"
            onClick={() => navigate('/admin/teams')}
            className="glass-card flex w-full items-center justify-between rounded-[18px] border border-white/55 px-4 py-3.5 text-right dark:border-white/10"
          >
            <span className="text-[13px] font-bold text-text">مدیریت تیم‌ها و کارشناسان</span>
            <ChevronLeft size={16} className="text-text-soft" />
          </button>
        )}
      </div>

      <BottomSheet
        open={createRole != null}
        onClose={() => setCreateRole(null)}
        title={
          createRole === 'supervisor'
            ? 'افزودن ناظر'
            : createRole === 'leader'
              ? 'افزودن سرتیم'
              : 'افزودن مدیر کل'
        }
      >
        <div className="space-y-3 pt-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام و نام خانوادگی"
            className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="شماره موبایل"
            inputMode="tel"
            className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
          />
          {createRole === 'super-admin' && (
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ایمیل"
              type="email"
              className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
            />
          )}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور اولیه (حداقل ۱۲ کاراکتر)"
            type="password"
            className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
          />
          {createRole === 'leader' && (
            <div className="space-y-2">
              {teams.length > 0 ? (
                <>
                  <p className="text-[11px] font-semibold text-text-soft">
                    {leaderTeamOptional
                      ? 'اختصاص به تیم (اختیاری — می‌توانی بعداً در مدیریت تیم‌ها تنظیم کنی)'
                      : 'تیم سرتیم را انتخاب کن'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {leaderTeamOptional && (
                      <Chip active={!teamId} onClick={() => setTeamId('')}>
                        بدون تیم
                      </Chip>
                    )}
                    {teams.map((team) => (
                      <Chip key={team.id} active={teamId === team.id} onClick={() => setTeamId(team.id)}>
                        {team.name}
                      </Chip>
                    ))}
                  </div>
                </>
              ) : leaderTeamOptional ? (
                <p className="rounded-[14px] border border-dashed border-white/55 px-3 py-2.5 text-[11px] font-semibold leading-6 text-text-soft dark:border-white/10">
                  هنوز تیمی ساخته نشده. سرتیم بدون تیم ذخیره می‌شود و بعداً از «مدیریت تیم‌ها» به تیم اختصاص می‌دهی.
                </p>
              ) : (
                <p className="rounded-[14px] border border-dashed border-amber-400/40 bg-amber-50/80 px-3 py-2.5 text-[11px] font-semibold leading-6 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  برای افزودن سرتیم ابتدا از بخش مدیریت تیم‌ها یک تیم بساز.
                </p>
              )}
            </div>
          )}
          <Button
            full
            size="lg"
            disabled={busy}
            icon={<UserPlus size={18} />}
            onClick={() => void submitCreate()}
          >
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
        </div>
      </BottomSheet>
    </Page>
  )
}

function StaffRow({
  person,
  meta,
  onOpen,
}: {
  person: {
    id: string
    firstName: string
    lastName: string
    role: Role
    avatar?: string | null
    callsToday: number
  }
  meta?: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
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
        <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{roleLabels[person.role]}</p>
        {meta && <p className="mt-1 text-[10px] font-semibold text-text-muted">{meta}</p>}
      </div>
      <div className="shrink-0 text-left">
        <p className="text-[12px] font-black tabular-nums text-text">{toFa(person.callsToday)}</p>
        <p className="text-[10px] font-semibold text-text-soft">تماس امروز</p>
      </div>
      <ChevronLeft size={14} className="shrink-0 text-text-soft" />
    </button>
  )
}
