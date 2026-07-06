/** Pricing module copy from Settings `pricing` group (backend-driven). */
export interface PricingSettings {
  module_title?: string;
  module_sub?: string;
  start_cta?: string;
  primary_cta?: string;
  plan_ready_title?: string;
  plan_ready_text?: string;
  confirmation_text?: string;
  max_installment_months?: number;
  installment_note?: string;
  cash_offers?: string[];
  cash_cta?: string;
  line_prompts?: Record<string, string>;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  module_title: 'قیمت حدودی درمانت رو در کمتر از یک دقیقه ببین',
  module_sub:
    'مدل درمان، برند، تعداد واحد و روش پرداخت رو انتخاب کن تا مشاور ما پلن دقیق و اختصاصی تو رو آماده کنه.',
  start_cta: 'شروع محاسبه هوشمند',
  primary_cta: 'دریافت پلن اختصاصی من',
  plan_ready_title: 'پلن اولیه شما آماده شد',
  plan_ready_text:
    'برای ارسال قیمت دقیق، شرایط اقساط تا ۱۲ ماه و پیشنهادهای فعال، شماره موبایل خود را وارد کنید.',
  confirmation_text:
    'درخواست شما ثبت شد. مشاور ما انتخاب‌های شما را بررسی می‌کند و قیمت دقیق، شرایط پرداخت و پیشنهادهای فعال را برایتان ارسال می‌کند.',
  max_installment_months: 12,
  installment_note:
    'امکان پرداخت تا ۱۲ ماه وجود دارد. جزئیات دقیق پیش‌پرداخت و مبلغ ماهانه بعد از بررسی توسط مشاور ارسال می‌شود.',
  cash_offers: [
    'تخفیف ویژه پرداخت نقدی',
    'اولویت در رزرو وقت',
    'مشاوره تخصصی رایگان',
    'پیشنهاد اختصاصی روی پکیج درمان',
  ],
  cash_cta: 'دریافت آفر نقدی من',
  line_prompts: {
    laminate:
      'انتخاب لمینت شما ثبت شد. برای بررسی مناسب‌ترین مدل، تعداد واحد پیشنهادی و شرایط پرداخت، شماره‌تان را وارد کنید.',
    implant:
      'انتخاب ایمپلنت شما نیاز به بررسی دقیق‌تری دارد. شماره‌تان را بگذارید تا مشاور درمان، بهترین برند و شرایط پرداخت مناسب شما را اعلام کند.',
    composite:
      'پلن کامپوزیت شما آماده شد. برای دریافت قیمت دقیق بر اساس تعداد واحد، برند انتخابی و شرایط پرداخت، شماره موبایل خود را وارد کنید.',
  },
};

export function parsePricingSettings(raw: Record<string, unknown> | undefined): PricingSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_PRICING_SETTINGS;
  return {
    ...DEFAULT_PRICING_SETTINGS,
    ...(raw as PricingSettings),
    line_prompts: {
      ...DEFAULT_PRICING_SETTINGS.line_prompts,
      ...((raw.line_prompts as Record<string, string>) ?? {}),
    },
    cash_offers: Array.isArray(raw.cash_offers)
      ? (raw.cash_offers as string[])
      : DEFAULT_PRICING_SETTINGS.cash_offers,
  };
}

/** Map service page slug → pricing line slug. */
export function serviceToPricingLine(serviceSlug: string): string {
  if (serviceSlug === 'cosmetic') return 'composite';
  if (['implant', 'laminate', 'composite'].includes(serviceSlug)) return serviceSlug;
  return 'composite';
}
