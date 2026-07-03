/**
 * Central source of Persian copy and homepage content for V1.
 *
 * Shape is intentionally CMS-ready — moving this to Sanity later is a
 * one-shot adapter swap; component code does not change.
 */

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
};

export type InsightStub = {
  slug: string;
  date: string; // ISO
  kicker: string;
  title: string;
};

export type NavLink = { href: string; label: string; external?: boolean };

export const site = {
  founder: "بهرام رستمی",
  founderLatin: "Bahram Rostami",
  ecosystem: "سات",
  course: "کمپین‌نویسی",
  domain: "bahramrostami.com",
  tagline: "سات | هر تماس، یه فروش",

  nav: [
    { href: "/course/campaign-writing", label: "کمپین‌نویسی" },
    { href: "/courses", label: "دوره‌ها" },
    { href: "/saat", label: "سات" },
    { href: "/transformations", label: "رضایت دانشجوها" },
    { href: "/insights", label: "بلاگ" },
    { href: "/events", label: "رویدادها" },
    { href: "/founder", label: "درباره‌ی بهرام" },
  ] satisfies NavLink[],

  ctaPrimary: { href: "/course/campaign-writing", label: "آغاز مسیر" },
  ctaSecondary: { href: "/saat", label: "دیدن سات" },

  hero: {
    headline: "از مخاطب تا کمپین،\nتا یک امپراتوری شخصی.",
    headlineMobile: "از مخاطب تا کمپین،\nتا امپراتوری شخصی.",
    sub: "اینجا صدا ساخته می‌شود — نه فروشنده.",
    note: "معمار مسیر رشد حرفه‌ای",
  },

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

  saat: {
    eyebrow: "سات · سیستم فروش تلفنی",
    title: "پشت این پروژه، یک سیستم فروش تلفنی واقعی هست.",
    subtitle:
      "سات برای کسانی ساخته شده که می‌خواهند فروش را جدی، منظم و قابل‌اندازه‌گیری پیش ببرند.",
    bodyMobile:
      "مینی‌اپ عملیاتی برای تماس، لید، پیگیری و فروش — برای تیم فروش منظم و نتیجه‌محور.",
    body: "یک مینی‌اپ عملیاتی برای مدیریت تماس، لید، پیگیری، فیدبک و فروش. از اولین تماس تا ثبت نتیجه، همه‌چیز در سات برای حرکت واقعی تیم فروش طراحی شده است.",
    perks: ["لید و تماس", "پیگیری و فیدبک", "فروش و کمیسیون"] as const,
    cta: { href: "/saat", label: "دیدن سات" },
    ctaSecondary: { href: "/saat", label: "آشنایی با سیستم" },
  },

  transformations: [
    {
      slug: "sara-r",
      name: "سارا ر.",
      role: "مشاور کسب‌وکار",
      before: "مخاطبِ خاموش، درآمدِ ناپایدار",
      after: "کمپینِ ماهانه، فهرستِ انتظار سه‌ماهه",
      oneLine: "از مشاوره پراکنده به برند شخصی با کمپین ماهانه و لیست انتظار.",
    },
    {
      slug: "amir-h",
      name: "امیر ه.",
      role: "طراح تجربه",
      before: "مخفی پشتِ نمونه‌کارها",
      after: "صدای حرفه‌ای در حوزه",
      oneLine: "از طراح گمنام به صدای مرجع در تجربه‌ی کاربری.",
    },
    {
      slug: "nazanin-k",
      name: "نازنین ک.",
      role: "مربی تغذیه",
      before: "مشتریانِ تک‌جلسه‌ای",
      after: "برنامه‌های گروهیِ پر",
      oneLine: "از جلسات تک‌نفره به برنامه‌های گروهی سه‌ماهه با لیست انتظار.",
    },
  ] satisfies Transformation[],

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

  footer: {
    tagline: "رشد حرفه‌ای، در یک اکوسیستم خصوصی.",
    columns: [
      {
        title: "محصولات",
        links: [
          { href: "/course/campaign-writing", label: "کمپین‌نویسی" },
          { href: "/courses", label: "دوره‌ها" },
          { href: "/mini-courses", label: "مینی‌دوره‌ها" },
          { href: "/saat", label: "سات" },
          { href: "/apply", label: "درخواست دسترسی" },
        ],
      },
      {
        title: "محتوا",
        links: [
          { href: "/insights", label: "بلاگ" },
          { href: "/guides", label: "راهنماها" },
          { href: "/resources", label: "منابع" },
          { href: "/transformations", label: "رضایت دانشجوها" },
          { href: "/faq", label: "سوالات متداول" },
        ],
      },
      {
        title: "ارتباط",
        links: [
          { href: "https://instagram.com/bahramrostami", label: "اینستاگرام", external: true },
          { href: "https://t.me/bahramrostami", label: "تلگرام", external: true },
          { href: "mailto:hello@bahramrostami.com", label: "ایمیل" },
        ],
      },
    ],
  },
} as const;
