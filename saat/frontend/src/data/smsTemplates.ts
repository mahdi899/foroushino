import type { Lead } from '@/types'

export interface LeadSmsTemplate {
  id: string
  label: string
  description: string
  build: (lead: Lead) => string
}

const COURSE_LINK = 'https://rostami.app/courses'
const CHANNEL_LINK = 'https://t.me/RostamiAppBot'
const REGISTER_LINK = 'https://rostami.app/register'
const PAYMENT_LINK = 'https://rostami.app/payment'

export const LEAD_SMS_TEMPLATES: LeadSmsTemplate[] = [
  {
    id: 'course',
    label: 'لینک دوره',
    description: 'معرفی کوتاه + لینک صفحه دوره',
    build: (lead) =>
      `سلام ${lead.firstName} عزیز،\nممنون از وقتتون. لینک معرفی دوره:\n${COURSE_LINK}`,
  },
  {
    id: 'channel',
    label: 'لینک کانال',
    description: 'دعوت به کانال تلگرام',
    build: (lead) =>
      `سلام ${lead.firstName} عزیز،\nبرای نمونه کارها و اخبار، کانال ما:\n${CHANNEL_LINK}`,
  },
  {
    id: 'register',
    label: 'لینک ثبت‌نام',
    description: 'لینک ثبت‌نام مستقیم',
    build: (lead) =>
      `سلام ${lead.firstName} عزیز،\nلینک ثبت‌نام:\n${REGISTER_LINK}`,
  },
  {
    id: 'payment',
    label: 'لینک پرداخت',
    description: 'ارسال لینک پرداخت',
    build: (lead) =>
      `سلام ${lead.firstName} عزیز،\nلینک پرداخت:\n${PAYMENT_LINK}`,
  },
]
