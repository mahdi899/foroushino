import { useNavigate } from 'react-router-dom'
import { PhoneCall, Undo2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TemperaturePicker } from '@/components/domain/TemperaturePicker'
import { stageLabels } from '@/data/labels'
import { haptic } from '@/lib/telegram'
import { performReturnLeadToPool } from '@/services/leadActions'
import type { Lead, SaleStage } from '@/types'

const stageOptions: SaleStage[] = [
  'new',
  'first_call',
  'interested',
  'follow_up',
  'meeting',
  'payment_pending',
  'won',
  'lost',
]

interface LeadStatusSheetProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onReturnedToPool?: () => void
}

export function LeadStatusSheet({ lead, open, onClose, onReturnedToPool }: LeadStatusSheetProps) {
  const navigate = useNavigate()
  const currentAgentId = useStore((s) => s.currentAgentId)
  const updateLeadStage = useStore((s) => s.updateLeadStage)
  const updateLeadTemperature = useStore((s) => s.updateLeadTemperature)
  const pushToast = useStore((s) => s.pushToast)

  const lockedByOther = !!lead.lockedBy && lead.lockedBy !== currentAgentId

  return (
    <BottomSheet open={open} onClose={onClose} title="تغییر وضعیت مشتری">
      <div className="space-y-5 pt-1">
        <TemperaturePicker
          value={lead.temperature}
          onChange={(temp) => {
            updateLeadTemperature(lead.id, temp)
            pushToast('میزان جدیت مشتری به‌روز شد')
          }}
        />
        <div>
          <p className="mb-2 text-xs font-bold text-neutral-500">مرحله فروش</p>
          <div className="flex flex-wrap gap-2">
            {stageOptions.map((s) => (
              <Chip
                key={s}
                active={lead.stage === s}
                onClick={() => {
                  updateLeadStage(lead.id, s)
                  pushToast('مرحله فروش به‌روزرسانی شد')
                }}
              >
                {stageLabels[s]}
              </Chip>
            ))}
          </div>
        </div>
        <Button full size="lg" icon={<PhoneCall size={18} />} onClick={onClose}>
          تایید
        </Button>

        {!lockedByOther && !lead.returnedToPool && lead.stage !== 'won' && lead.stage !== 'lost' && (
          <button
            onClick={() => {
              haptic('warning')
              void performReturnLeadToPool(lead.id).then(() => {
                pushToast('مشتری به صف عمومی برگشت')
                onClose()
                if (onReturnedToPool) {
                  onReturnedToPool()
                } else {
                  navigate('/leads')
                }
              })
            }}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-[13px] font-bold text-error-500"
          >
            <Undo2 size={15} />
            بازگشت این مشتری به صف عمومی
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
