import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'
import type { Role, Team } from '@/types'
import { roleLabels } from '@/data/labels'

type StaffFormSheetProps = {
  open: boolean
  title: string
  role: Extract<Role, 'supervisor' | 'leader'>
  name: string
  phone: string
  teamId: string
  teams: Team[]
  showTeamPicker: boolean
  busy?: boolean
  onName: (value: string) => void
  onPhone: (value: string) => void
  onTeamId: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function StaffFormSheet({
  open,
  title,
  role,
  name,
  phone,
  teamId,
  teams,
  showTeamPicker,
  busy,
  onName,
  onPhone,
  onTeamId,
  onClose,
  onSubmit,
}: StaffFormSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4 pt-1">
        <p className="text-[12px] font-semibold text-text-soft">
          نقش: {roleLabels[role]}
        </p>
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
        {showTeamPicker && (
          <select
            value={teamId}
            onChange={(e) => onTeamId(e.target.value)}
            className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
          >
            <option value="">تیم را انتخاب کن</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        <Button full size="lg" disabled={busy} icon={<UserPlus size={18} />} onClick={onSubmit}>
          {busy ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
      </div>
    </BottomSheet>
  )
}
