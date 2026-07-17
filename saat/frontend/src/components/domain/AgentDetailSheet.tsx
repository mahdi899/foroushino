import { CreditCard, Landmark, Trash2, UserPlus, Copy } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Avatar } from '@/components/ui/Avatar'
import { availabilityLabels } from '@/data/labels'
import { availabilityDotClass } from '@/components/domain/icons'
import { formatDuration, formatHms, formatMoney, toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import type { Agent, Availability } from '@/types'

function formatShiftBrief(totalSec: number): string {
  if (totalSec <= 0) return '—'
  if (totalSec < 3600) return formatDuration(totalSec)
  return formatHms(totalSec)
}

function copyBankValue(raw: string, label: string, pushToast: (msg: string, tone?: 'error' | 'info') => void) {
  const value = raw.replace(/\s/g, '')
  void navigator.clipboard?.writeText(value).then(
    () => pushToast(`${label} کپی شد`),
    () => pushToast('کپی ناموفق بود', 'error'),
  )
}

function AgentStatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'success' | 'primary'
}) {
  return (
    <div className="rounded-[12px] border border-white/55 bg-white/30 px-2.5 py-2 text-center dark:border-white/10 dark:bg-white/5">
      <p
        className={cn(
          'text-[15px] font-black tabular-nums leading-tight',
          accent === 'success' && 'text-emerald-600 dark:text-emerald-400',
          accent === 'primary' && 'text-[#3390EC] dark:text-[#8774E1]',
          !accent && 'text-text',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[9px] font-bold text-text-soft">{label}</p>
    </div>
  )
}

function BankDetailRow({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: typeof CreditCard
  label: string
  value: string
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="shrink-0 text-text-soft" />
      <div className="min-w-0 flex-1 text-right">
        <p className="text-[10px] font-bold text-text-soft">{label}</p>
        <p className="ltr-nums mt-0.5 text-[13px] font-black tabular-nums tracking-wide text-text">{toFa(value)}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="glass-inset flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/55 text-[#3390EC] transition-all active:scale-95 dark:border-white/10 dark:text-[#8774E1]"
        aria-label={`کپی ${label}`}
      >
        <Copy size={14} />
      </button>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset rounded-[14px] border border-white/55 px-3 py-2.5 dark:border-white/10">
      <p className="text-[10px] font-bold text-text-soft">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold text-text">{value}</p>
    </div>
  )
}

export function AgentDetailSheet({
  open,
  onClose,
  title,
  agent,
  teams,
  viewMode = false,
  availability,
  showFinance = false,
  name = '',
  phone = '',
  teamId = '',
  canEdit = false,
  canViewBank = false,
  canClearBank = false,
  onName,
  onPhone,
  onTeam,
  onSubmit,
  onClearBank,
  pushToast,
}: {
  open: boolean
  onClose: () => void
  title: string
  agent?: Agent | null
  teams: { id: string; name: string }[]
  viewMode?: boolean
  availability?: Availability
  showFinance?: boolean
  name?: string
  phone?: string
  teamId?: string
  canEdit?: boolean
  canViewBank?: boolean
  canClearBank?: boolean
  onName?: (v: string) => void
  onPhone?: (v: string) => void
  onTeam?: (v: string) => void
  onSubmit?: () => void
  onClearBank?: () => void
  pushToast?: (msg: string, tone?: 'error' | 'info') => void
}) {
  const cardNumber = agent?.bankCard ?? agent?.bankCardMasked
  const hasBankInfo = !!(cardNumber || agent?.bankSheba || agent?.bankShebaRegistered)
  const teamName = teams.find((team) => team.id === (teamId || agent?.teamId))?.name ?? 'بدون تیم'
  const readOnly = viewMode || !canEdit
  const showBankSection = hasBankInfo && (canViewBank || canClearBank)

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-3 pt-1">
        {agent && (
          <>
            <div className="flex items-center gap-3 rounded-[16px] border border-white/55 bg-white/30 px-3 py-3 dark:border-white/10 dark:bg-white/5">
              <Avatar
                id={agent.id}
                first={agent.firstName}
                last={agent.lastName}
                src={agent.avatar}
                size={52}
                ring
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-text">
                  {agent.firstName} {agent.lastName}
                </p>
                {availability && (
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-text-soft">
                    <span className={cn('h-2 w-2 rounded-full', availabilityDotClass[availability])} />
                    {availabilityLabels[availability]}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] font-semibold text-text-soft">{teamName}</p>
              </div>
            </div>

            <div className="rounded-[14px] border border-white/55 bg-white/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
              <p className="mb-2 text-[11px] font-extrabold text-text-soft">آمار تماس و شیفت</p>
              <div className="grid grid-cols-2 gap-2">
                <AgentStatTile label="زنگ امروز" value={toFa(agent.callsToday)} />
                <AgentStatTile label="موفق امروز" value={toFa(agent.successfulToday)} />
                <AgentStatTile label="تماس ماه" value={toFa(agent.callsThisMonth ?? 0)} />
                <AgentStatTile label="شیفت ماه" value={formatShiftBrief(agent.shiftSecondsThisMonth ?? 0)} />
              </div>
            </div>

            {showFinance && (
              <div className="rounded-[14px] border border-white/55 bg-white/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <p className="mb-2 text-[11px] font-extrabold text-text-soft">آمار مالی ماه</p>
                <div className="grid grid-cols-2 gap-2">
                  <AgentStatTile
                    label="درآمد ماه"
                    value={formatMoney(agent.earnedThisMonth ?? 0)}
                    accent="success"
                  />
                  <AgentStatTile
                    label="برداشت ماه"
                    value={formatMoney(agent.withdrawnThisMonth ?? 0)}
                    accent="primary"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {readOnly ? (
          <>
            <ProfileField label="نام و نام خانوادگی" value={name || `${agent?.firstName ?? ''} ${agent?.lastName ?? ''}`.trim()} />
            <ProfileField label="شماره موبایل" value={toFa(phone || agent?.phone || '—')} />
            <ProfileField label="تیم" value={teamName} />
          </>
        ) : (
          <>
            <input
              value={name}
              onChange={(e) => onName?.(e.target.value)}
              placeholder="نام و نام خانوادگی"
              className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
            />
            <input
              value={phone}
              onChange={(e) => onPhone?.(e.target.value)}
              placeholder="شماره موبایل"
              inputMode="tel"
              className="glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold dark:border-white/10"
            />
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <Chip key={team.id} active={teamId === team.id} onClick={() => onTeam?.(team.id)}>
                  {team.name}
                </Chip>
              ))}
            </div>
          </>
        )}

        {showBankSection && (
          <div className="rounded-[14px] border border-white/55 bg-white/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
            {cardNumber && (
              <BankDetailRow
                icon={CreditCard}
                label={`کارت${agent?.bankCardConfirmed ? ' · تایید شده' : ' · منتظر تایید'}`}
                value={cardNumber}
                onCopy={() => {
                  haptic('selection')
                  copyBankValue(cardNumber, 'شماره کارت', pushToast ?? (() => {}))
                }}
              />
            )}
            {(agent?.bankSheba || agent?.bankShebaRegistered) && (
              <div className={cardNumber ? 'mt-2.5 border-t border-white/40 pt-2.5 dark:border-white/10' : undefined}>
                {agent.bankSheba ? (
                  <BankDetailRow
                    icon={Landmark}
                    label="شماره شبا"
                    value={agent.bankSheba}
                    onCopy={() => {
                      haptic('selection')
                      copyBankValue(agent.bankSheba!, 'شماره شبا', pushToast ?? (() => {}))
                    }}
                  />
                ) : (
                  <p className="flex items-center gap-1.5 text-[12px] font-bold text-text">
                    <Landmark size={13} className="text-text-soft" />
                    شبا ثبت شده
                  </p>
                )}
              </div>
            )}
            {canClearBank && onClearBank && (
              <Button
                full
                size="md"
                variant="ghost"
                className="mt-2"
                icon={<Trash2 size={15} />}
                onClick={onClearBank}
              >
                حذف اطلاعات بانکی
              </Button>
            )}
          </div>
        )}

        {!readOnly && onSubmit && (
          <Button full size="lg" icon={<UserPlus size={18} />} onClick={onSubmit}>
            ذخیره
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
