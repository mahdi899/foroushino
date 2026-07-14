import type {
  ActivityLog,
  Campaign,
  Commission,
  ObjectionDoc,
  Payment,
  PayoutRequest,
  Product,
  Sale,
  ScriptDoc,
  TeamReport,
  AgentReport,
  Wallet,
  WalletTransaction,
} from '@/types'
import { MY_AGENT_ID } from './mock'

const now = Date.now()
const HOUR = 3600_000
const DAY = 86400_000
const at = (offsetMs: number) => new Date(now + offsetMs).toISOString()

export const PRODUCT_ID = 'p-campaign-writing'

export const products: Product[] = [
  {
    id: PRODUCT_ID,
    name: 'دوره شغل کمپین‌نویسی',
    price: 18_000_000,
    category: 'دوره آموزشی',
    commissionRate: 15,
    isActive: true,
  },
  {
    id: 'p-ads-mastery',
    name: 'دوره تبلیغات حرفه‌ای (به‌زودی)',
    price: 12_000_000,
    category: 'دوره آموزشی',
    commissionRate: 12,
    isActive: false,
  },
]

export const campaigns: Campaign[] = [
  { id: 'c-spring', name: 'کمپین بهار', productId: PRODUCT_ID, isActive: true },
  { id: 'c-webinar', name: 'کمپین وبینار', productId: PRODUCT_ID, isActive: true },
]

const today = new Date().toISOString().slice(0, 10)

export const teamReports: TeamReport[] = [
  {
    id: 'tr-1',
    teamId: 't1',
    teamName: 'تیم آلفا',
    reportDate: today,
    status: 'submitted',
    summary: {
      calls_today: 42,
      successful_today: 11,
      conversion_rate: 26.2,
      pending_confirmation: 0,
      payment_submitted: 2,
      active_agents: 4,
    },
    leaderNotes: 'تیم امروز روی مشتریان داغ تمرکز کرد.',
    submittedBy: 'a-leader',
    submitterName: 'لیدر آلفا',
    createdAt: at(-2 * HOUR),
  },
  {
    id: 'tr-2',
    teamId: 't2',
    teamName: 'تیم بتا',
    reportDate: today,
    status: 'approved',
    summary: {
      calls_today: 28,
      successful_today: 6,
      conversion_rate: 21.4,
      pending_confirmation: 1,
      payment_submitted: 0,
      active_agents: 3,
    },
    submittedBy: 'a-leader2',
    submitterName: 'لیدر بتا',
    approvedAt: at(-1 * HOUR),
    createdAt: at(-3 * HOUR),
  },
]

export const agentReports: AgentReport[] = [
  {
    id: 'ar-1',
    agentId: 'a2',
    agentName: 'کارشناس ۲',
    teamId: 't1',
    teamName: 'تیم آلفا',
    reportDate: today,
    status: 'submitted',
    summary: {
      calls_today: 14,
      successful_today: 4,
      conversion_rate: 28.6,
      followups_completed: 2,
      sales_submitted: 1,
    },
    agentNotes: 'روی مشتریان داغ تمرکز کردم.',
    createdAt: at(-90 * 60_000),
  },
  {
    id: 'ar-2',
    agentId: MY_AGENT_ID,
    agentName: 'من',
    teamId: 't1',
    teamName: 'تیم آلفا',
    reportDate: today,
    status: 'approved',
    summary: {
      calls_today: 11,
      successful_today: 3,
      conversion_rate: 27.3,
      followups_completed: 1,
      sales_submitted: 0,
    },
    leaderNotes: 'عملکرد خوب بود.',
    approvedAt: at(-30 * 60_000),
    createdAt: at(-2 * HOUR),
  },
]

// Two confirmed sales (won leads) and pending ones from payment_pending leads
export const sales: Sale[] = [
  {
    id: 'sale-1',
    leadId: 'l8',
    agentId: MY_AGENT_ID,
    teamId: 't1',
    productId: PRODUCT_ID,
    amount: 18_000_000,
    status: 'confirmed',
    paymentMethod: 'gateway',
    createdAt: at(-5 * DAY),
    submittedAt: at(-5 * DAY + HOUR),
    confirmedAt: at(-4 * DAY),
    confirmedBy: 'a-mgr',
  },
  {
    id: 'sale-2',
    leadId: 'l32',
    agentId: MY_AGENT_ID,
    teamId: 't1',
    productId: PRODUCT_ID,
    amount: 18_000_000,
    status: 'confirmed',
    paymentMethod: 'card',
    createdAt: at(-4 * DAY),
    submittedAt: at(-4 * DAY + HOUR),
    confirmedAt: at(-3 * DAY),
    confirmedBy: 'a-mgr',
  },
  {
    id: 'sale-3',
    leadId: 'l6',
    agentId: MY_AGENT_ID,
    teamId: 't1',
    productId: PRODUCT_ID,
    amount: 18_000_000,
    status: 'payment_submitted',
    paymentMethod: 'card',
    createdAt: at(-4 * HOUR),
    submittedAt: at(-3 * HOUR),
  },
  {
    id: 'sale-5',
    leadId: 'l9',
    agentId: 'a2',
    teamId: 't1',
    productId: PRODUCT_ID,
    amount: 18_000_000,
    status: 'payment_submitted',
    paymentMethod: 'gateway',
    createdAt: at(-2 * HOUR),
    submittedAt: at(-1 * HOUR),
  },
  {
    id: 'sale-4',
    leadId: 'l15',
    agentId: 'a2',
    teamId: 't1',
    productId: PRODUCT_ID,
    amount: 18_000_000,
    status: 'payment_pending',
    paymentMethod: null,
    createdAt: at(-3 * HOUR),
  },
]

export const payments: Payment[] = [
  {
    id: 'pay-1',
    saleId: 'sale-1',
    amount: 18_000_000,
    method: 'gateway',
    referenceNumber: '۷۷۳۱۹۹۸۲',
    status: 'verified',
    submittedAt: at(-5 * DAY + HOUR),
    verifiedAt: at(-4 * DAY),
  },
  {
    id: 'pay-2',
    saleId: 'sale-2',
    amount: 18_000_000,
    method: 'card',
    referenceNumber: '۸۸۱۲۴۵۶۷',
    status: 'verified',
    submittedAt: at(-4 * DAY + HOUR),
    verifiedAt: at(-3 * DAY),
  },
  {
    id: 'pay-3',
    saleId: 'sale-3',
    amount: 18_000_000,
    method: 'card',
    referenceNumber: '۹۹۳۳۱۱۲۲',
    status: 'submitted',
    submittedAt: at(-3 * HOUR),
  },
  {
    id: 'pay-5',
    saleId: 'sale-5',
    amount: 18_000_000,
    method: 'gateway',
    referenceNumber: '۴۴۵۵۶۶۷۷',
    status: 'submitted',
    submittedAt: at(-1 * HOUR),
  },
]

// Commission from sale-1 available, sale-2 pending, plus the pending sale-3
export const commissions: Commission[] = [
  {
    id: 'com-1',
    saleId: 'sale-1',
    agentId: MY_AGENT_ID,
    productId: PRODUCT_ID,
    leadId: 'l8',
    saleAmount: 18_000_000,
    commissionRate: 15,
    commissionAmount: 2_700_000,
    status: 'available',
    createdAt: at(-4 * DAY),
    approvedAt: at(-3 * DAY),
    availableAt: at(-1 * DAY),
  },
  {
    id: 'com-2',
    saleId: 'sale-2',
    agentId: MY_AGENT_ID,
    productId: PRODUCT_ID,
    leadId: 'l32',
    saleAmount: 18_000_000,
    commissionRate: 15,
    commissionAmount: 2_700_000,
    status: 'approved',
    createdAt: at(-3 * DAY),
    approvedAt: at(-2 * DAY),
    availableAt: at(1 * DAY),
  },
]

export const wallet: Wallet = {
  balanceAvailable: 2_700_000,
  balancePending: 2_700_000,
  balanceLocked: 0,
  totalEarned: 5_400_000,
  totalPaid: 0,
}

export const walletTransactions: WalletTransaction[] = [
  {
    id: 'wt-1',
    type: 'commission_available',
    amount: 2_700_000,
    description: 'پورسانت فروش پریسا کریمی',
    referenceType: 'commission',
    referenceId: 'com-1',
    createdAt: at(-1 * DAY),
  },
  {
    id: 'wt-2',
    type: 'commission_pending',
    amount: 2_700_000,
    description: 'پورسانت فروش آیدا شجاعی',
    referenceType: 'commission',
    referenceId: 'com-2',
    createdAt: at(-3 * DAY),
  },
]

export const payoutRequests: PayoutRequest[] = []

export const activityLogs: ActivityLog[] = [
  {
    id: 'al-1',
    agentId: MY_AGENT_ID,
    kind: 'sale',
    title: 'فروش تایید شد: پریسا کریمی',
    meta: 'پورسانت ۲٬۷۰۰٬۰۰۰ تومان',
    createdAt: at(-4 * DAY),
  },
  {
    id: 'al-2',
    agentId: MY_AGENT_ID,
    kind: 'call',
    title: 'تماس با نگین فراهانی',
    meta: 'پرداخت در انتظار',
    createdAt: at(-4 * HOUR),
  },
  {
    id: 'al-3',
    agentId: 'a2',
    kind: 'payment',
    title: 'ثبت واریز توسط سوپروایزر',
    meta: 'فروش تیم آلفا',
    createdAt: at(-2 * HOUR),
  },
  {
    id: 'al-4',
    agentId: 'a-leader',
    kind: 'sale',
    title: 'گزارش روزانه تیم ارسال شد',
    meta: 'تیم آلفا',
    createdAt: at(-90 * 60_000),
  },
  {
    id: 'al-5',
    agentId: 'a-sup',
    kind: 'sale',
    title: 'گزارش تیم تایید و به مدیریت ارسال شد',
    meta: 'تیم بتا',
    createdAt: at(-1 * HOUR),
  },
]

// Full sales scripts library (spec §12)
export const scriptsLibrary: ScriptDoc[] = [
  {
    id: 'sc-1',
    productId: PRODUCT_ID,
    title: 'سلام و معرفی کوتاه',
    stage: 'opening',
    content:
      'سلام، وقت شما بخیر. من [نام] از تیم سات هستم. چند لحظه وقت دارید درباره فروش آنلاین صحبت کنیم؟',
  },
  {
    id: 'sc-2',
    productId: PRODUCT_ID,
    title: 'پرسش از نیاز و وضعیت شغلی',
    stage: 'discovery',
    content:
      'الان بیشتر روی چه کاری تمرکز دارید؟ بزرگ‌ترین چالش‌تون توی جذب مشتری یا فروش چیه؟',
  },
  {
    id: 'sc-3',
    productId: PRODUCT_ID,
    title: 'پرسش از هدف درآمدی',
    stage: 'discovery',
    content: 'اگر همه‌چیز خوب پیش بره، دوست دارید توی ۳ تا ۶ ماه آینده به چه درآمدی برسید؟',
  },
  {
    id: 'sc-4',
    productId: PRODUCT_ID,
    title: 'معرفی کوتاه ارزش دوره',
    stage: 'pitch',
    content:
      'دوره کمپین‌نویسی دقیقاً همین مسیر رو قدم‌به‌قدم یاد می‌ده تا فروش‌تون قابل پیش‌بینی و تکرارپذیر بشه.',
  },
  {
    id: 'sc-5',
    productId: PRODUCT_ID,
    title: 'پاسخ به اعتراض قیمت',
    stage: 'objection',
    content:
      'اگر نگرانی قیمت دارید، پلن اقساطی داریم و ارزش دوره چند برابر هزینه‌ست؛ اجازه بدید دقیق‌تر توضیح بدم.',
  },
  {
    id: 'sc-6',
    productId: PRODUCT_ID,
    title: 'پاسخ به اعتراض زمان',
    stage: 'objection',
    content: 'دوره فشرده و کاربردیه؛ روزی ۳۰ دقیقه کافیه و ضبط‌شده هم در دسترسه.',
  },
  {
    id: 'sc-7',
    productId: PRODUCT_ID,
    title: 'دعوت به ثبت‌نام یا مشاوره',
    stage: 'closing',
    content: 'می‌خواید همین حالا ثبت‌نام‌تون رو نهایی کنیم یا یک جلسه مشاوره کوتاه بذاریم؟',
  },
]

export const objectionsLibrary: ObjectionDoc[] = [
  {
    id: 'ob-price',
    productId: PRODUCT_ID,
    key: 'price',
    title: 'قیمت بالاست',
    suggestedResponse:
      'ارزش دوره چند برابر هزینه‌شه و پلن اقساطی داریم؛ حتی یک فروش موفق هزینه دوره رو برمی‌گردونه.',
    category: 'مالی',
  },
  {
    id: 'ob-time',
    productId: PRODUCT_ID,
    key: 'time',
    title: 'وقت ندارم',
    suggestedResponse: 'روزی ۳۰ دقیقه کافیه، جلسات ضبط می‌شن و هر وقت وقت داشتید می‌بینید.',
    category: 'زمان',
  },
  {
    id: 'ob-trust',
    productId: PRODUCT_ID,
    key: 'trust',
    title: 'مطمئن نیستم به درد من بخوره',
    suggestedResponse: 'نمونه نتایج واقعی دانشجوهای مشابه شما رو می‌فرستم تا خیالتون راحت بشه.',
    category: 'اعتماد',
  },
  {
    id: 'ob-thinking',
    productId: PRODUCT_ID,
    key: 'thinking',
    title: 'بعداً تصمیم می‌گیرم',
    suggestedResponse: 'کاملاً درک می‌کنم؛ اجازه بدید یک زمان کوتاه برای پیگیری بذاریم که فراموش نشه.',
    category: 'تصمیم',
  },
  {
    id: 'ob-spouse',
    productId: PRODUCT_ID,
    key: 'spouse_decision',
    title: 'باید مشورت کنم',
    suggestedResponse: 'حتماً؛ چه اطلاعاتی بدم که راحت‌تر بتونید توضیح بدید و تصمیم بگیرید؟',
    category: 'تصمیم',
  },
  {
    id: 'ob-budget',
    productId: PRODUCT_ID,
    key: 'no_budget',
    title: 'الان پول ندارم',
    suggestedResponse: 'با پلن اقساطی می‌تونید همین حالا شروع کنید و در طول دوره پرداخت کنید.',
    category: 'مالی',
  },
  {
    id: 'ob-info',
    productId: PRODUCT_ID,
    key: 'need_more_info',
    title: 'اطلاعات کافی ندارم',
    suggestedResponse: 'سرفصل‌ها و نمونه جلسه رو براتون می‌فرستم و یک تماس کوتاه هماهنگ می‌کنیم.',
    category: 'اطلاعات',
  },
]

// Training checklist & rules (spec §12)
export const startChecklist: string[] = [
  'شیفت کاری را شروع کن و وضعیت را «آماده تماس» بگذار',
  'پیگیری‌های عقب‌افتاده امروز را اول انجام بده',
  'اسکریپت فروش را یک بار مرور کن',
  'قبل از هر تماس، خلاصه مشتری را بخوان',
  'بعد از هر تماس، نتیجه را دقیق ثبت کن',
]

export const commissionRules: string[] = [
  'پورسانت فقط بعد از تایید نهایی فروش آزاد می‌شود.',
  'فروش فیک یا پرداخت ناقص باعث برگشت پورسانت می‌شود.',
  'فقط موجودی «قابل برداشت» قابل درخواست تسویه است.',
  'پس از تایید فروش، پورسانت ابتدا معلق و سپس قابل برداشت می‌شود.',
]

export const callingRules: string[] = [
  'با مشتریان «مزاحم نشو» هرگز تماس نگیر.',
  'هر تماس باید نتیجه ثبت‌شده داشته باشد.',
  'اطلاعات مشتری محرمانه است و نباید بیرون از سیستم به اشتراک گذاشته شود.',
  'در تماس مودب باش؛ مشتری عصبانی را به پیگیری بعدی منتقل کن.',
]

export const successTips: string[] = [
  'اول گوش کن، بعد پیشنهاد بده.',
  'روی درد و هدف مشتری تمرکز کن، نه فقط ویژگی دوره.',
  'اعتراض را جدی بگیر و پاسخ کوتاه و مطمئن بده.',
  'همیشه یک قدم بعدی مشخص بذار (پیگیری یا ثبت‌نام).',
]
