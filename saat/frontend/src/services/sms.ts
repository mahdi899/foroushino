import { http } from './http'

export interface LeadSmsTemplateOption {
  id: string
  label: string
  description: string
}

export const DEMO_SMS_TEMPLATES: LeadSmsTemplateOption[] = [
  {
    id: 'course',
    label: 'لینک دوره',
    description: 'ارسال لینک معرفی دوره',
  },
  {
    id: 'channel',
    label: 'لینک کانال',
    description: 'ارسال لینک کانال تلگرام',
  },
  {
    id: 'register',
    label: 'لینک ثبت‌نام',
    description: 'ارسال لینک ثبت‌نام',
  },
  {
    id: 'payment',
    label: 'لینک پرداخت',
    description: 'ارسال لینک پرداخت',
  },
  {
    id: 'custom',
    label: 'پیامک دلخواه',
    description: 'متن دلخواه کارشناس',
  },
]

export async function fetchLeadSmsTemplates(): Promise<LeadSmsTemplateOption[]> {
  try {
    const items = await http.get<LeadSmsTemplateOption[]>('/sms/templates')
    return items.length > 0 ? items : DEMO_SMS_TEMPLATES
  } catch {
    return DEMO_SMS_TEMPLATES
  }
}

export async function sendLeadSms(
  leadId: string,
  template: string,
  body?: string,
): Promise<{ rec_id: string }> {
  return http.post<{ rec_id: string }>(`/leads/${leadId}/sms`, {
    template,
    ...(body ? { body } : {}),
  })
}
