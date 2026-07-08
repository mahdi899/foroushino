// Shared misc content: treatment-path journey, clinic experience, technology,
// testimonials, global FAQ, blog seeds, navigation. All editable placeholders.

import { resolveClientImage, resolveMainServiceImage } from '@/config/media';

export const treatmentPath = [
  { key: 'need', title: 'بررسی نیاز و خواسته شما', desc: '', icon: 'Smile' },
  { key: 'smart', title: 'مشاوره اولیه', desc: '', icon: 'Sparkles' },
  { key: 'review', title: 'معاینه و تصویربرداری', desc: '', icon: 'ScanLine' },
  { key: 'plan', title: 'ارائه طرح درمان و هزینه', desc: '', icon: 'PenTool' },
  { key: 'start', title: 'شروع درمان', desc: '', icon: 'Activity' },
  { key: 'follow', title: 'پیگیری و مراقبت پس از درمان', desc: '', icon: 'ShieldCheck' },
];

export const clinicExperience = [
  { title: 'پذیرش', desc: 'استقبال آرام و حرفه‌ای.' },
  { title: 'مشاوره', desc: 'گفت‌وگو و آنالیز نیاز شما.' },
  { title: 'طرح درمان', desc: 'برنامه اختصاصی و شفاف.' },
  { title: 'درمان', desc: 'اجرای دقیق با تجهیزات دیجیتال.' },
  { title: 'پیگیری', desc: 'مراقبت و پشتیبانی پس از درمان.' },
];

export const technologies = [
  { icon: 'ScanLine', title: 'اسکن داخل دهانی', desc: 'قالب‌گیری بدون خمیر.' },
  { icon: 'Boxes', title: 'CBCT سه‌بعدی', desc: 'بررسی دقیق استخوان و فک.' },
  { icon: 'Cpu', title: 'طراحی دیجیتال روکش', desc: 'ساخت دقیق و هماهنگ با فرم دندان.' },
  { icon: 'Syringe', title: 'بی‌حسی کنترل‌شده', desc: 'تزریق آرام‌تر و راحت‌تر.' },
  { icon: 'Sparkles', title: 'لیزر درمانی', desc: 'درمان‌های لثه و سفیدسازی.' },
  { icon: 'MonitorSmartphone', title: 'طراحی دیجیتال لبخند', desc: 'پیش‌نمایش نتیجه پیش از درمان.' },
];

/** Client portrait images for testimonial cards. */
export const testimonialImagesByTag: Record<string, string> = {
  ایمپلنت: resolveClientImage('سارا احمدی'),
  'ایمپلنت دیجیتال': resolveClientImage('سارا احمدی'),
  لمینت: resolveClientImage('محمد رضایی'),
  اقساط: resolveClientImage('نگار حمیدی'),
  'تجربه کلینیک': resolveClientImage('علی موسوی'),
  'طراحی لبخند': resolveClientImage('محمد رضایی'),
};

export const testimonials = [
  {
    name: 'سارا احمدی',
    text: 'از مشاوره تا درمان همه‌چیز شفاف بود؛ هر مرحله را دقیق توضیح دادند و نتیجه ایمپلنت فراتر از انتظارم شد. حس می‌کنم لبخندم را پس گرفتم و دیگر برای خندیدن در جمع احساس خجالت نمی‌کنم.',
    rating: 5,
    tag: 'ایمپلنت',
    verified: true,
    video: true,
    featured: true,
    imageUrl: resolveClientImage('سارا احمدی'),
  },
  {
    name: 'محمد رضایی',
    text: 'لمینت‌ها کاملاً طبیعی هستند و با فرم صورت من هماهنگ شد. قیمت از اول مشخص بود و در هر جلسه دقیقاً می‌دانستم چه کاری انجام می‌شود؛ نتیجه از همان روزی که روکش نصب شد کاملاً قابل توجه بود.',
    rating: 5,
    tag: 'لمینت',
    verified: true,
    imageUrl: resolveClientImage('محمد رضایی'),
  },
  {
    name: 'نگار حمیدی',
    text: 'پرداخت اقساطی واقعاً کمک بزرگی بود و استرس مالی درمان را کم کرد. تیم در هر مرحله آرام و حرفه‌ای بود و همیشه پاسخگوی سؤال‌هایم بودند؛ تجربه‌ام از اول تا آخر منظم و قابل پیش‌بینی بود.',
    rating: 5,
    tag: 'اقساط',
    verified: true,
    imageUrl: resolveClientImage('نگار حمیدی'),
  },
  {
    name: 'علی موسوی',
    text: 'محیط کلینیک لوکس و تمیز است و همین از همان ورود حس خوبی به من داد. برخورد پذیرش و مشاوره حرفه‌ای بود و احساس نکردم عجله‌ای برای تصمیم‌گیری وجود دارد؛ برایم تجربه‌ای متفاوت از دندانپزشکی قبلی بود.',
    rating: 5,
    tag: 'تجربه کلینیک',
    imageUrl: resolveClientImage('علی موسوی'),
  },
];

export const globalFaqs = [
  { q: 'آدرس کلینیک کجاست؟', a: 'کلینیک آترین در محدوده جردن (آفریقا)، تهران واقع شده است. [آدرس دقیق — جایگزین شود]' },
  { q: 'مشاوره رایگان است؟', a: 'بله، مشاوره اولیه تلفنی و ارزیابی نیاز شما رایگان است.' },
  { q: 'پرداخت اقساطی چطور است؟', a: 'پرداخت تا ۱۲ ماه با پیش‌پرداخت و شرایط قابل تنظیم؛ جزئیات در صفحه اقساط.' },
  { q: 'ضمانت خدمات دارید؟', a: 'بله، روی درمان‌ها و متریال ضمانت کتبی ارائه می‌شود. [شرایط دقیق — جایگزین شود]' },
  { q: 'آیا درمان دیجیتال است؟', a: 'بله، از اسکنر داخل‌دهانی، CBCT و طراحی دیجیتال لبخند استفاده می‌کنیم.' },
];

export const blogPosts = [
  {
    slug: 'implant-price-guide',
    title: 'راهنمای کامل قیمت ایمپلنت دندان در ۱۴۰۴',
    excerpt: 'عوامل مؤثر بر قیمت ایمپلنت، تفاوت برندها و نکات انتخاب درست را بررسی می‌کنیم.',
    category: 'ایمپلنت',
    cover: resolveMainServiceImage('implant'),
    readingTime: '۷ دقیقه',
  },
  {
    slug: 'laminate-vs-composite',
    title: 'لمینت بهتر است یا کامپوزیت؟ مقایسه کامل',
    excerpt: 'تفاوت لمینت سرامیکی و کامپوزیت ونیر از نظر دوام، زیبایی و هزینه.',
    category: 'زیبایی',
    cover: resolveMainServiceImage('laminate'),
    readingTime: '۶ دقیقه',
  },
  {
    slug: 'digital-smile-design',
    title: 'طراحی دیجیتال لبخند چیست و چه مزیتی دارد؟',
    excerpt: 'با DSD نتیجه نهایی لبخند را پیش از شروع درمان ببینید.',
    category: 'طراحی لبخند',
    cover: '/images/journey/smart.webp',
    readingTime: '۵ دقیقه',
  },
  {
    slug: 'implant-installment-guide',
    title: 'ایمپلنت اقساطی؛ همه‌چیز درباره شرایط پرداخت',
    excerpt: 'پیش‌پرداخت، تعداد اقساط و نکات مهم پرداخت اقساطی ایمپلنت.',
    category: 'اقساط',
    cover: '/images/journey/pay.webp',
    readingTime: '۵ دقیقه',
  },
];

export const getPost = (slug: string) => blogPosts.find((p) => p.slug === slug);

export const mainNav = [
  { href: '/implant', label: 'ایمپلنت' },
  { href: '/laminate', label: 'لمینت' },
  { href: '/cosmetic', label: 'خدمات زیبایی' },
  { href: '/pricing', label: 'قیمت‌ها' },
  { href: '/cases', label: 'نمونه کارها' },
  { href: '/insights', label: 'مجله' },
  { href: '/contact', label: 'تماس' },
];
