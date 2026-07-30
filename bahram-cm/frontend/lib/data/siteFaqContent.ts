/**
 * Canonical FAQ + chatbot prepared answers for the public site.
 * Kept in frontend source so production builds always ship these texts
 * (not overwritten by empty DB / stale admin settings on deploy).
 */
export type SiteFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const SITE_FAQ_ITEMS: SiteFaqItem[] = [
  {
    id: 'which-course',
    question: 'کدام دوره برای من مناسب‌تر است؟',
    answer:
      'انتخاب دوره به هدف و سطح فعلی شما بستگی دارد. اگر هنوز مطمئن نیستید، با پاسخ به چند سؤال کوتاه درباره تجربه، مهارت و هدفتان، مناسب‌ترین مسیر آموزشی را به شما پیشنهاد می‌دهم.',
  },
  {
    id: 'how-to-register',
    question: 'چطور می‌توانم ثبت‌نام کنم؟',
    answer:
      'برای ثبت‌نام، وارد صفحه دوره موردنظرتان شوید و روی گزینه «ثبت‌نام» بزنید. بعد از تکمیل اطلاعات و پرداخت، دسترسی دوره در حساب کاربری شما فعال می‌شود.',
  },
  {
    id: 'what-is-saat',
    question: 'سات چیست و چطور می‌توانم وارد آن شوم؟',
    answer:
      'سات پلتفرم فروش تلفنی آکادمی بهرام است که برای آموزش، تمرین و فعالیت حرفه‌ای در فروش طراحی شده. برای ورود باید شرایط اولیه را داشته باشید و درخواست عضویتتان را ثبت کنید تا بررسی شود.',
  },
  {
    id: 'course-support',
    question: 'دوره‌ها چه پشتیبانی و دسترسی‌ای دارند؟',
    answer:
      'بعد از ثبت‌نام، به محتوای دوره و مسیر آموزشی آن دسترسی خواهید داشت. برای سؤالات آموزشی یا مشکلات فنی نیز می‌توانید از بخش پشتیبانی با تیم ما در ارتباط باشید.',
  },
];

export const SITE_FAQ_GROUP = {
  id: 'site-faq',
  title: 'سوالات متداول',
  items: SITE_FAQ_ITEMS.map((item) => ({ q: item.question, a: item.answer })),
};

export const SITE_QUICK_SUGGESTIONS = SITE_FAQ_ITEMS.map((item) => ({
  id: item.id,
  label: item.question,
  response: item.answer,
}));
