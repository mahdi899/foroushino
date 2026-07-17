import { useMemo, useState } from 'react'
import { Search, UserPlus, Check } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { toEn, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

export type TeamStaffOption = {
  id: string
  firstName: string
  lastName: string
  teamId?: string
  teamName?: string | null
}

type TeamFormSheetProps = {
  open: boolean
  title: string
  name: string
  leaderId: string
  memberIds: string[]
  leaderOptions: TeamStaffOption[]
  memberOptions: TeamStaffOption[]
  supervisorId?: string
  supervisorOptions?: TeamStaffOption[]
  showSupervisorPicker?: boolean
  membersCapacity?: number
  submitLabel?: string
  rosterOnly?: boolean
  onName: (value: string) => void
  onLeader: (value: string) => void
  onMemberIds: (value: string[]) => void
  onSupervisor?: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  busy?: boolean
}

function matchesQuery(option: TeamStaffOption, query: string) {
  const needle = query.trim()
  if (!needle) return true

  const fullName = `${option.firstName} ${option.lastName}`.trim()
  const needleEn = toEn(needle).toLowerCase()

  return (
    fullName.includes(needle) ||
    option.firstName.includes(needle) ||
    option.lastName.includes(needle) ||
    (option.teamName?.includes(needle) ?? false) ||
    option.id.includes(needleEn)
  )
}

function PersonRow({
  option,
  selected,
  onClick,
  meta,
}: {
  option: TeamStaffOption
  selected: boolean
  onClick: () => void
  meta?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-right transition-colors',
        selected
          ? 'border-[#3390EC]/35 bg-[#3390EC]/10 dark:border-[#8774E1]/35 dark:bg-[#8774E1]/12'
          : 'border-white/55 bg-white/20 dark:border-white/10 dark:bg-white/5',
      )}
    >
      <Avatar
        id={option.id}
        first={option.firstName}
        last={option.lastName}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-text">
          {option.firstName} {option.lastName}
        </p>
        {meta && <p className="mt-0.5 truncate text-[10px] font-semibold text-text-soft">{meta}</p>}
      </div>
      {selected && <Check size={16} className="shrink-0 text-[#3390EC] dark:text-[#8774E1]" />}
    </button>
  )
}

export function TeamFormSheet({
  open,
  title,
  name,
  leaderId,
  memberIds,
  leaderOptions,
  memberOptions,
  supervisorId = '',
  supervisorOptions = [],
  showSupervisorPicker = false,
  membersCapacity = 15,
  submitLabel = 'ذخیره',
  rosterOnly = false,
  onName,
  onLeader,
  onMemberIds,
  onSupervisor,
  onClose,
  onSubmit,
  busy,
}: TeamFormSheetProps) {
  const [leaderSearch, setLeaderSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [supervisorSearch, setSupervisorSearch] = useState('')

  const filteredLeaders = useMemo(
    () => leaderOptions.filter((option) => matchesQuery(option, leaderSearch)),
    [leaderOptions, leaderSearch],
  )

  const filteredMembers = useMemo(
    () => memberOptions.filter((option) => matchesQuery(option, memberSearch)),
    [memberOptions, memberSearch],
  )

  const filteredSupervisors = useMemo(
    () => supervisorOptions.filter((option) => matchesQuery(option, supervisorSearch)),
    [supervisorOptions, supervisorSearch],
  )

  const selectedLeader = leaderOptions.find((option) => option.id === leaderId)
  const selectedSupervisor = supervisorOptions.find((option) => option.id === supervisorId)

  const toggleMember = (id: string) => {
    if (memberIds.includes(id)) {
      onMemberIds(memberIds.filter((row) => row !== id))
      return
    }
    if (memberIds.length >= membersCapacity) return
    onMemberIds([...memberIds, id])
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4 pt-1">
        {!rosterOnly && (
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="نام تیم"
            className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
          />
        )}

        {!rosterOnly && showSupervisorPicker && onSupervisor && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-text-soft">ناظر مسئول</p>
              {selectedSupervisor && (
                <button
                  type="button"
                  onClick={() => onSupervisor('')}
                  className="text-[10px] font-bold text-text-soft"
                >
                  حذف ناظر
                </button>
              )}
            </div>
            <div className="glass-inset mb-2 flex items-center gap-2 rounded-[14px] border border-white/55 px-3 py-2.5 dark:border-white/10">
              <Search size={15} className="shrink-0 text-text-soft" />
              <input
                value={supervisorSearch}
                onChange={(e) => setSupervisorSearch(e.target.value)}
                placeholder="جستجوی ناظر…"
                className="w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:text-text-muted"
              />
            </div>
            <div className="max-h-[160px] space-y-1.5 overflow-y-auto no-scrollbar">
              {filteredSupervisors.length === 0 ? (
                <p className="py-4 text-center text-[12px] font-semibold text-text-soft">ناظری پیدا نشد</p>
              ) : (
                filteredSupervisors.map((supervisor) => (
                  <PersonRow
                    key={supervisor.id}
                    option={supervisor}
                    selected={supervisorId === supervisor.id}
                    onClick={() => onSupervisor(supervisorId === supervisor.id ? '' : supervisor.id)}
                    meta={
                      supervisor.teamName
                        ? `تیم اصلی: ${supervisor.teamName}`
                        : 'بدون تیم ثابت'
                    }
                  />
                ))
              )}
            </div>
          </div>
        )}

        {!rosterOnly && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-text-soft">سرتیم</p>
            {selectedLeader && (
              <button
                type="button"
                onClick={() => onLeader('')}
                className="text-[10px] font-bold text-text-soft"
              >
                حذف سرتیم
              </button>
            )}
          </div>
          <div className="glass-inset mb-2 flex items-center gap-2 rounded-[14px] border border-white/55 px-3 py-2.5 dark:border-white/10">
            <Search size={15} className="shrink-0 text-text-soft" />
            <input
              value={leaderSearch}
              onChange={(e) => setLeaderSearch(e.target.value)}
              placeholder="جستجوی سرتیم…"
              className="w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:text-text-muted"
            />
          </div>
          <div className="max-h-[180px] space-y-1.5 overflow-y-auto no-scrollbar">
            {filteredLeaders.length === 0 ? (
              <p className="py-4 text-center text-[12px] font-semibold text-text-soft">سرتیمی پیدا نشد</p>
            ) : (
              filteredLeaders.map((leader) => (
                <PersonRow
                  key={leader.id}
                  option={leader}
                  selected={leaderId === leader.id}
                  onClick={() => onLeader(leaderId === leader.id ? '' : leader.id)}
                  meta={leader.teamName ? `تیم فعلی: ${leader.teamName}` : 'بدون تیم'}
                />
              ))
            )}
          </div>
        </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-text-soft">
              {rosterOnly ? 'انتخاب کارشناسان تیم' : 'کارشناسان تیم'}
            </p>
            <span className="text-[10px] font-bold tabular-nums text-text-soft">
              {toFa(memberIds.length)} / {toFa(membersCapacity)}
            </span>
          </div>
          <div className="glass-inset mb-2 flex items-center gap-2 rounded-[14px] border border-white/55 px-3 py-2.5 dark:border-white/10">
            <Search size={15} className="shrink-0 text-text-soft" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="جستجو و افزودن کارشناس…"
              className="w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:text-text-muted"
            />
          </div>
          <div className="max-h-[220px] space-y-1.5 overflow-y-auto no-scrollbar">
            {filteredMembers.length === 0 ? (
              <p className="py-4 text-center text-[12px] font-semibold text-text-soft">کارشناسی پیدا نشد</p>
            ) : (
              filteredMembers.map((member) => {
                const selected = memberIds.includes(member.id)
                const onOtherTeam = !!member.teamId && !selected
                return (
                  <PersonRow
                    key={member.id}
                    option={member}
                    selected={selected}
                    onClick={() => toggleMember(member.id)}
                    meta={
                      onOtherTeam && member.teamName
                        ? `در تیم ${member.teamName} — با انتخاب منتقل می‌شود`
                        : selected
                          ? 'عضو این تیم'
                          : 'بدون تیم'
                    }
                  />
                )
              })
            )}
          </div>
        </div>

        <Button
          full
          size="lg"
          disabled={busy}
          icon={<UserPlus size={18} />}
          onClick={onSubmit}
        >
          {busy ? 'در حال ذخیره…' : submitLabel}
        </Button>
      </div>
    </BottomSheet>
  )
}
