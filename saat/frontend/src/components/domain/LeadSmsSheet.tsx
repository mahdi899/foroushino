import { useEffect, useState } from 'react'
import { Link2, Loader2, PencilLine, Send, type LucideIcon } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { fetchLeadSmsTemplates, sendLeadSms, DEMO_SMS_TEMPLATES, type LeadSmsTemplateOption } from '@/services/sms'
import { ApiError } from '@/services/http'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import type { Lead } from '@/types'

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  course: Link2,
  channel: Send,
  register: Link2,
  payment: Link2,
  custom: PencilLine,
}

interface LeadSmsSheetProps {
  open: boolean
  onClose: () => void
  lead: Lead
}

export function LeadSmsSheet({ open, onClose, lead }: LeadSmsSheetProps) {
  const pushToast = useStore((s) => s.pushToast)
  const [templates, setTemplates] = useState<LeadSmsTemplateOption[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customBody, setCustomBody] = useState('')

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    void fetchLeadSmsTemplates()
      .then((items) => {
        if (!cancelled) setTemplates(items)
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates(DEMO_SMS_TEMPLATES)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, pushToast])

  const handleClose = () => {
    onClose()
    setCustomOpen(false)
    setCustomBody('')
    setSending(null)
  }

  const handleSend = async (template: LeadSmsTemplateOption, body?: string) => {
    if (sending) return

    if (template.id === 'custom') {
      setCustomOpen(true)
      return
    }

    haptic('light')
    setSending(template.id)
    try {
      await sendLeadSms(lead.id, template.id, body)
      pushToast('پیامک از سامانه ارسال شد.', 'success')
      handleClose()
    } catch (error) {
      haptic('error')
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ارسال پیامک ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setSending(null)
    }
  }

  const handleSendCustom = async () => {
    const customTemplate = templates.find((item) => item.id === 'custom')
    if (!customTemplate || !customBody.trim()) return

    haptic('light')
    setSending('custom')
    try {
      await sendLeadSms(lead.id, 'custom', customBody.trim())
      pushToast('پیامک از سامانه ارسال شد.', 'success')
      handleClose()
    } catch (error) {
      haptic('error')
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ارسال پیامک ناموفق بود'
      pushToast(message, 'error')
    } finally {
      setSending(null)
    }
  }

  const presetTemplates = templates.filter((item) => item.id !== 'custom')
  const customTemplate = templates.find((item) => item.id === 'custom')
  const gridTemplates = customTemplate ? [...presetTemplates, customTemplate] : presetTemplates

  return (
    <BottomSheet open={open} onClose={handleClose} title="ارسال پیامک">
      <div className="space-y-3 pb-1 pt-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[13px] font-semibold text-text-soft">
            <Loader2 size={16} className="animate-spin" />
            در حال بارگذاری قالب‌ها…
          </div>
        ) : templates.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-white/55 px-4 py-5 text-center text-[13px] font-semibold leading-6 text-text-muted dark:border-white/10">
            هنوز پترن ملی پیامک ست نیست.
          </p>
        ) : !customOpen ? (
          <div className="grid grid-cols-2 gap-2.5">
            {gridTemplates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.id] ?? Link2
              const busy = sending === template.id
              const isCustom = template.id === 'custom'

              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={!!sending}
                  onClick={() => void handleSend(template)}
                  className={cn(
                    'flex min-w-0 flex-col items-center gap-2 rounded-[16px] border p-3.5 text-center',
                    isCustom
                      ? 'border-dashed border-[#3390EC]/35 bg-[#3390EC]/6 active:bg-[#3390EC]/12 dark:border-[#8774E1]/35 dark:bg-[#8774E1]/8'
                      : 'border-white/55 bg-white/35 active:bg-white/60 dark:border-white/10 dark:bg-white/[0.04]',
                    busy && 'opacity-70',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]',
                      isCustom
                        ? 'bg-[#3390EC]/12 text-[#3390EC] dark:bg-[#8774E1]/14 dark:text-[#8774E1]'
                        : 'bg-[#3390EC]/12 text-[#3390EC] dark:bg-[#8774E1]/14 dark:text-[#8774E1]',
                    )}
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} strokeWidth={2.25} />}
                  </span>
                  <span className="min-w-0 w-full">
                    <span className="block text-[13px] font-bold leading-5 text-text">{template.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="text-[12px] font-bold text-[#3390EC] dark:text-[#8774E1]"
            >
              بازگشت به قالب‌ها
            </button>

            <textarea
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="متن پیامک را بنویس..."
              rows={5}
              autoFocus
              className="w-full rounded-[16px] border border-border bg-neutral-50 p-4 text-[13px] font-semibold leading-7 text-neutral-800 outline-none focus:border-primary-400 dark:bg-white/5 dark:text-neutral-100"
            />

            <button
              type="button"
              disabled={!customBody.trim() || !!sending}
              onClick={() => void handleSendCustom()}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-bold text-white',
                customBody.trim() && !sending
                  ? 'bg-[#3390EC] dark:bg-[#8774E1]'
                  : 'cursor-not-allowed bg-[#3390EC]/35 dark:bg-[#8774E1]/35',
              )}
            >
              {sending === 'custom' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              ارسال از سامانه
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
