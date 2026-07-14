import { useNavigate } from 'react-router-dom'
import { CalendarPlus, PhoneCall, type LucideIcon } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useStore } from '@/store/useStore'
import { getNextLead } from '@/lib/leadUtils'

interface QuickActionSheetProps {
  open: boolean
  onClose: () => void
}

export function QuickActionSheet({ open, onClose }: QuickActionSheetProps) {
  const navigate = useNavigate()
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)

  const actions: { icon: LucideIcon; label: string; desc: string; onClick: () => void }[] = [
    {
      icon: PhoneCall,
      label: 'شروع تماس بعدی',
      desc: 'بهترین مشتری پیشنهادی',
      onClick: () => {
        const next = getNextLead(leads, followups, currentAgentId)
        onClose()
        if (next) openCallMethodSheet(next)
      },
    },
    {
      icon: CalendarPlus,
      label: 'پیگیری جدید',
      desc: 'یک یادآوری برای خودت بساز',
      onClick: () => {
        onClose()
        navigate('/followups?new=1')
      },
    },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="اقدام سریع">
      <div className="space-y-2.5 pt-1">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/70 p-3.5 text-right active:bg-neutral-50"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon size={20} />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-extrabold text-neutral-900">{a.label}</p>
                <p className="text-[11px] font-bold text-neutral-400">{a.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
