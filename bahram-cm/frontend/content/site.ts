/**
 * Central source of Persian copy and homepage content for V1.
 *
 * Shape is intentionally CMS-ready — moving this to Sanity later is a
 * one-shot adapter swap; component code does not change.
 */

import { siteConfig } from "@/config/site";

export type StoryFrame = {
  kicker: string;
  title: string;
  body: string;
};

export type Transformation = {
  slug: string;
  name: string;
  role: string;
  before: string;
  after: string;
  oneLine: string;
  quote: string;
  metricLabel: string;
  metricValue: string;
};

/** Featured on homepage (BigTestimonial) — keep in sync with MDX frontmatter. */
export const FEATURED_TRANSFORMATION_SLUGS = [
  "sara-r",
  "amir-h",
  "nazanin-k",
  "reza-m",
] as const;

export type InsightStub = {
  slug: string;
  date: string; // ISO
  kicker: string;
  title: string;
};

export type NavLink = { href: string; label: string; shortLabel?: string; external?: boolean };

export const site = {
  founder: "بهرام رستمی",
  founderLatin: "Bahram Rostami",
  ecosystem: "سات",
  course: "کمپین‌نویسی",
  domain: "bahramrostami.com",
  tagline: "سات؛ هر تماس، یک فرصت فروش",

  nav: [
    { href: "/course/campaign-writing", label: "کمپین‌نویسی", shortLabel: "کمپین" },
    { href: "/courses", label: "دوره‌ها", shortLabel: "دوره" },
    { href: "/saat", label: "سات" },
    { href: "/transformations", label: "رضایت دانشجوها", shortLabel: "رضایت" },
    { href: "/insights", label: "بلاگ" },
    { href: "/founder", label: "درباره‌ی بهرام", shortLabel: "بهرام" },
    { href: "/contact", label: "تماس با ما", shortLabel: "تماس" },
  ] satisfies NavLink[],

  ctaPrimary: { href: "/course/campaign-writing", label: "آغاز مسیر" },
  ctaSecondary: { href: "/saat", label: "دیدن سات" },

  hero: {
    headline: "از مخاطب تا کمپین،\nتا یک امپراتوری شخصی.",
    headlineMobile: "از مخاطب تا کمپین،\nتا امپراتوری شخصی.",
    sub: "اینجا صدا ساخته می‌شود — نه فروشنده.",
    note: "معمار مسیر رشد حرفه‌ای",
  },

  manifestoEyebrow: "چرا این مسیر؟",

  manifesto: [
    "عصرِ صداست؛ بیشتر صداها گم‌اند.",
    "حرفه با محتوا شروع می‌شود؛ با کمپین می‌چسبد.",
    "اینجا برای همین مسیر است.",
  ],

  story: [
    {
      kicker: "گام یکم — نگاه",
      title: "اول، چشم‌ها عوض می‌شوند",
      body: "کمپین از همان نگاه درست شروع می‌شود؛ نه از ابزار.",
    },
    {
      kicker: "گام دوم — پیام",
      title: "بعد، پیام شکل می‌گیرد",
      body: "پیامی که برای مخاطب درست آشناست، هسته‌ی کمپین است.",
    },
    {
      kicker: "گام سوم — کمپین",
      title: "سپس، کمپین متولد می‌شود",
      body: "روایت پیوسته در زمان — نه یک پست یا تبلیغ پراکنده.",
    },
    {
      kicker: "گام چهارم — امپراتوری",
      title: "و در پایان، امپراتوری شخصی",
      body: "روایت که جمع شود، اعتماد جمع می‌شود و کسب‌وکار حرفه‌ای بالا می‌آید.",
    },
  ] satisfies StoryFrame[],

  campaignJourney: {
    eyebrow: "مسیر کمپین‌نویسی",
    title: "اگر در این مسیر شرکت کنی، چه می‌شود؟",
    steps: [
      {
        title: "دوره را می‌گذرانی",
        body: "۱۰ فصل کمپین‌نویسی با تمرین عملی؛ نگاه، پیام و ساختار کمپین را می‌سازی.",
      },
      {
        title: "کمپین‌نویس حرفه‌ای می‌شوی",
        body: "مسیر شغل کمپین‌نویسی با درآمد ماهانه — نه فقط یادگیری، بلکه حرفه.",
      },
      {
        title: "پروژه می‌گیری",
        body: "بعد از اتمام دوره، وارد جریان پروژه‌های واقعی برندها و کسب‌وکارها می‌شوی.",
      },
    ],
    cta: { href: "/course/campaign-writing", label: "آغاز مسیر کمپین" },
  },

  mainPaths: {
    eyebrow: "دو مسیر اصلی",
    title: "از اینجا شروع می‌کنی",
    lead: "انتخاب با توست؛ هر مسیر، تجربه‌ای متفاوت.",
    trust: [
      { label: "امن و قابل اعتماد" },
      { label: "نتیجه‌محور" },
      { label: "سریع و هوشمند" },
    ],
    items: [
      {
        href: "/course/campaign-writing",
        label: "کمپین نویسی",
        tagline: "درآمد ۲۱ تا ۸۰ میلیون",
        cta: "ورود",
      },
      {
        href: "/saat",
        label: "سات",
        tagline: "انقلابی در فروش تلفنی",
        cta: "ثبت نام",
      },
    ],
  },

  saat: {
    eyebrow: "سات · سیستم عملیاتی فروش",
    title: "سات؛ سیستم عملیاتی فروش",
    teaserTitle: "سات؛ هر تماس، یک فرصت فروش",
    teaserLead:
      "سیستم عملیاتی فروش برای مدیریت لید، تماس، پیگیری، فیدبک، فروش و کمیسیون — پل بین آموزش و اجرا.",
    subtitle:
      "در سات، آموزش کمپین‌نویسی به اجرای واقعی فروش وصل می‌شود؛ از لید تا تماس، از پیگیری تا کمیسیون.",
    bodyMobile:
      "سیستم عملیاتی فروش — لید، تماس، پیگیری و کمیسیون در یک مسیر واحد.",
    body: "سات یک سیستم عملیاتی فروش است که آموزش، لید، تماس، پیگیری، فیدبک و کمیسیون را به هم وصل می‌کند. اینجا کمپین‌نویسی وارد عمل می‌شود.",
    perks: ["لید و تماس", "پیگیری و فیدبک", "فروش و کمیسیون"] as const,
    cta: { href: "/saat#wap", label: "بررسی شرایط ورود" },
  },

  transformations: [
    {
      slug: "sara-r",
      name: "سارا ر.",
      role: "مشاور کسب‌وکار",
      before: "مخاطب خاموش، درآمد ناپایدار",
      after: "کمپین ماهانه، لیست انتظار ۳ ماهه",
      oneLine:
        "با ساختن یک روایت منسجم و کمپین‌های ماهانه، مسیر جذب مشتری برای سارا قابل پیش‌بینی شد.",
      quote: "اولین باری بود که می‌دانستم ماه بعد قرار است چه اتفاقی بیفتد.",
      metricLabel: "لیست انتظار",
      metricValue: "۳ ماه",
    },
    {
      slug: "amir-h",
      name: "امیر ه.",
      role: "طراح تجربه",
      before: "پشتِ نمونه‌کارها پنهان",
      after: "صدای مرجع در حوزه",
      oneLine: "امیر با کمپین‌های موضوعی، مخاطب مناسب خود را پیدا کرد و جایگاه حرفه‌ای‌اش تثبیت شد.",
      quote: "وقتی طرزِ فکرم را گفتم، آدم‌های درست پیدایم کردند.",
      metricLabel: "پروژه‌های ورودی",
      metricValue: "۴ برابر",
    },
    {
      slug: "nazanin-k",
      name: "نازنین ک.",
      role: "مربی تغذیه",
      before: "جلسات پراکنده",
      after: "برنامه‌های گروهی پر",
      oneLine: "نازنین با روایت تخصصی و پیام یکپارچه، از فروش تک‌جلسه‌ای به برنامه‌های گروهی رسید.",
      quote: "دیگر وقتم را نمی‌فروشم؛ تحول می‌فروشم.",
      metricLabel: "درآمد ماهانه",
      metricValue: "۲.۵ برابر",
    },
    {
      slug: "reza-m",
      name: "رضا م.",
      role: "مدرس زبان",
      before: "قیمت‌گذاری بر اساس رقبا",
      after: "جایگاه پریمیوم",
      oneLine: "رضا با تثبیت تخصص و روایت متمایز، از رقابت قیمتی خارج شد و به جایگاه پریمیوم رسید.",
      quote: "وقتی فهمیدم چه چیزی‌ام منحصربه‌فرد است، قیمت دیگر بحث نبود.",
      metricLabel: "نرخ هر دوره",
      metricValue: "۳ برابر",
    },
  ] satisfies Transformation[],

  studentResults: {
    title: "نتایج واقعی از دانشجوها",
    lead: "تغییراتی که قابل اندازه‌گیری‌اند — نه فقط حس خوب.",
  },

  insights: [
    {
      slug: "voice-vs-noise",
      date: "2026-05-10",
      kicker: "نگاه",
      title: "تفاوتِ صدا با سر و صدا",
    },
    {
      slug: "campaign-not-content",
      date: "2026-05-08",
      kicker: "مسیر",
      title: "چرا «کمپین» با «محتوا» فرق دارد",
    },
    {
      slug: "becoming-not-learning",
      date: "2026-05-05",
      kicker: "هویت",
      title: "از یادگیری، به شدن",
    },
  ] satisfies InsightStub[],

  founderAside: {
    eyebrow: "بنیان‌گذار آکادمی",
    title: "بهرام رستمی",
    bodyMobile: "بیش از ده سال آموزش؛ هدفم نسخه‌ی حرفه‌ای‌تر توست.",
    body: "بیش از ده سال آموزش و ساختن؛ کمک به نسخه‌ی حرفه‌ای‌تر تو. آکادمی همان مسیر را قالب می‌کند.",
    signature: "بهرام",
  },

  finalCta: {
    title: "وقتی آماده‌ای،\nدر باز است.",
    body: "کمپین‌نویسی، ورودی جایی است که تو سازنده‌ای — نه مخاطب.",
    cta: { href: "/course/campaign-writing", label: "آغاز مسیر" },
  },

  contactPage: {
    title: "تماس با ما",
    description: "سؤال، پیشنهاد یا درخواست همکاری — تیم ما در کوتاه‌ترین زمان پاسخ می‌دهد.",
    channelsTitle: "راه‌های ارتباط",
    formTitle: "ارسال پیام",
    formLead: "فرم را پر کن تا به‌زودی با تو تماس بگیریم.",
    topics: [
      { value: "courses", label: "دوره‌ها و آموزش" },
      { value: "saat", label: "سات و فروش" },
      { value: "support", label: "پشتیبانی و دسترسی" },
      { value: "other", label: "سایر موضوعات" },
    ],
  },

  footer: {
    tagline: "رشد حرفه‌ای، در یک اکوسیستم خصوصی.",
    navTitle: "صفحات",
    contactTitle: "ارتباط",
    contact: [
      { href: siteConfig.social.instagram, label: "اینستاگرام", external: true },
      { href: siteConfig.social.telegram, label: "تلگرام", external: true },
      { href: siteConfig.social.rubika, label: "روبیکا", external: true },
      { href: `mailto:${siteConfig.contact.email}`, label: "ایمیل" },
    ],
    trustBadges: [
      { id: "enamad", alt: "نماد اعتماد الکترونیکی", href: "https://trustseal.enamad.ir/" },
      { id: "samandehi", alt: "ساماندهی", href: "https://samandehi.ir/" },
      { id: "zarinpal", alt: "درگاه پرداخت زرین‌پال", href: "https://www.zarinpal.com/" },
    ],
  },
} as const;
