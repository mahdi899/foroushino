import { sitePhotos } from "@/lib/site-photo-paths";

export type CampaignLearnItem = {
  id: string;
  text: string;
  image: string;
  imageAlt: string;
};

export type CampaignPathStep = {
  n: string;
  title: string;
  body: string;
  image: string;
  icon:
    | "eye"
    | "user-search"
    | "message-square"
    | "pen-line"
    | "file-text"
    | "layers";
};

export const campaignLearnItems: CampaignLearnItem[] = [
  {
    id: "audience",
    text: "قبل از نوشتن، مخاطب را تحلیل کنی.",
    image: sitePhotos.storyStep[0]!,
    imageAlt: "تحلیل مخاطب کمپین",
  },
  {
    id: "message",
    text: "پیام اصلی کمپین را بسازی.",
    image: sitePhotos.manifestoPortraitA,
    imageAlt: "طراحی پیام اصلی",
  },
  {
    id: "copy",
    text: "تیتر، متن تبلیغاتی، پیشنهاد فروش و دعوت به اقدام بنویسی.",
    image: sitePhotos.courseBackstage,
    imageAlt: "نوشتن متن تبلیغاتی",
  },
  {
    id: "scenario",
    text: "سناریوی فروش طراحی کنی.",
    image: sitePhotos.storyStep[1]!,
    imageAlt: "سناریوی فروش",
  },
  {
    id: "follow-up",
    text: "لید را پیگیری کنی و مسیر تصمیم‌گیری مخاطب را کامل‌تر کنی.",
    image: sitePhotos.landscapeSession,
    imageAlt: "پیگیری لید و تصمیم‌گیری",
  },
];

export const campaignPathSteps: CampaignPathStep[] = [
  {
    n: "۱",
    title: "شناخت کمپین",
    body: "درک می‌کنی کمپین چیست، چرا بعضی پیام‌ها می‌فروشند و بعضی فقط دیده می‌شوند.",
    icon: "eye",
    image: sitePhotos.storyStep[0]!,
  },
  {
    n: "۲",
    title: "شناخت مخاطب",
    body: "یاد می‌گیری چطور نیاز، ترس، تردید و انگیزه مخاطب را پیدا کنی.",
    icon: "user-search",
    image: sitePhotos.storyStep[1]!,
  },
  {
    n: "۳",
    title: "طراحی پیام فروش",
    body: "یاد می‌گیری پیام اصلی کمپین را بسازی؛ پیامی که ساده، شفاف و قانع‌کننده باشد.",
    icon: "message-square",
    image: sitePhotos.manifestoPortraitA,
  },
  {
    n: "۴",
    title: "نوشتن متن تبلیغاتی",
    body: "تیتر، متن کوتاه، متن معرفی، CTA و پیام‌های فروش را تمرین می‌کنی.",
    icon: "pen-line",
    image: sitePhotos.courseBackstage,
  },
  {
    n: "۵",
    title: "ساخت پیشنهاد فروش",
    body: "یاد می‌گیری چطور محصول را به شکلی ارائه کنی که مخاطب دلیل واضحی برای خرید داشته باشد.",
    icon: "file-text",
    image: sitePhotos.storyStep[2]!,
  },
  {
    n: "۶",
    title: "سناریوی فروش و پیگیری",
    body: "می‌فهمی بعد از دیده شدن کمپین، چطور مسیر ارتباط، تماس، پیگیری و تصمیم‌گیری مخاطب را کامل کنی.",
    icon: "layers",
    image: sitePhotos.landscapeSession,
  },
];

export const campaignDifferenceRows = [
  {
    negative: "فقط تیتر و متن می‌نویسی.",
    positive: "مخاطب را تحلیل می‌کنی و پیام اصلی می‌سازی.",
  },
  {
    negative: "پیشنهاد فروش مبهم می‌ماند.",
    positive: "پیشنهاد جذاب با دلیل واضح برای خرید طراحی می‌کنی.",
  },
  {
    negative: "کمپین دیده می‌شود اما نتیجه نمی‌دهد.",
    positive: "مسیر ارتباط، پیگیری و تصمیم‌گیری را کامل می‌کنی.",
  },
] as const;
