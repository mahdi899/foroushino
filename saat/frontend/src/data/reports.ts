import type { LeadSource, SaleStage } from '@/types'

export interface FunnelStage {
  stage: SaleStage
  count: number
}

export interface SourcePerf {
  source: LeadSource
  leads: number
  conversion: number
}

export interface TeamRow {
  id: string
  name: string
  calls: number
  successful: number
  conversion: number
  trend: number
}

export interface Insight {
  id: string
  tone: 'positive' | 'warning' | 'info'
  title: string
  body: string
}

export const funnel: FunnelStage[] = [
  { stage: 'new', count: 540 },
  { stage: 'first_call', count: 386 },
  { stage: 'interested', count: 214 },
  { stage: 'follow_up', count: 152 },
  { stage: 'meeting', count: 96 },
  { stage: 'payment_pending', count: 58 },
  { stage: 'won', count: 41 },
]

export const sourcePerf: SourcePerf[] = [
  { source: 'instagram', leads: 186, conversion: 31 },
  { source: 'webinar', leads: 142, conversion: 28 },
  { source: 'ads', leads: 124, conversion: 19 },
  { source: 'website', leads: 98, conversion: 24 },
  { source: 'telegram', leads: 76, conversion: 14 },
  { source: 'form', leads: 64, conversion: 22 },
  { source: 'excel', leads: 40, conversion: 9 },
]

export const teamRows: TeamRow[] = [
  { id: 't1', name: 'تیم آلفا', calls: 312, successful: 118, conversion: 31, trend: 8 },
  { id: 't2', name: 'تیم بتا', calls: 268, successful: 84, conversion: 24, trend: -3 },
  { id: 't3', name: 'تیم گاما', calls: 241, successful: 92, conversion: 27, trend: 5 },
]

export const managerInsights: Insight[] = [
  {
    id: 'mi1',
    tone: 'positive',
    title: 'رشد نرخ تبدیل',
    body: 'نرخ تبدیل کل این هفته ۴٪ بهتر از هفته قبل شد.',
  },
  {
    id: 'mi2',
    tone: 'warning',
    title: 'افت تیم بتا',
    body: 'تیم بتا ۳٪ افت داشته، نیاز به بررسی کیفیت تماس.',
  },
  {
    id: 'mi3',
    tone: 'info',
    title: 'منبع پربازده',
    body: 'اینستاگرام بیشترین نرخ تبدیل را دارد، بودجه را افزایش بده.',
  },
]

export const leaderInsights: Insight[] = [
  {
    id: 'li1',
    tone: 'warning',
    title: 'پیگیری عقب‌افتاده',
    body: '۲ پیگیری امروز عقب افتاده، به رضا محمدی یادآوری کن.',
  },
  {
    id: 'li2',
    tone: 'positive',
    title: 'عملکرد عالی نگار',
    body: 'نگار احمدی بیشترین تماس امروز را داشته.',
  },
]

export const supervisorInsights: Insight[] = [
  {
    id: 'si1',
    tone: 'warning',
    title: 'مشتری بحرانی',
    body: '۳ مشتری داغ بیش از ۲ روز بدون پیگیری مانده‌اند.',
  },
  {
    id: 'si2',
    tone: 'info',
    title: 'کیفیت تماس',
    body: 'میانگین زمان تماس تیم آلفا بالاتر از استاندارد است.',
  },
]
