import { siteStorageMedia } from '@/config/media';

/**
 * Site photo paths — canonical gallery storage (`/storage/media/site/*`).
 * Managed via admin gallery; legacy `/media/*` URLs redirect here.
 */
export const sitePhotos = {
  heroBackground: siteStorageMedia('hero-background.webp'),
  /** گالری — background-mobile (مربع ۹۴۱px) */
  heroBackgroundMobile: siteStorageMedia('hero-background-mobile.webp'),
  /** @deprecated use heroBackground */
  heroLightGrid: siteStorageMedia('hero-background.webp'),
  /** @deprecated use heroBackgroundMobile */
  heroLightGridMobile: siteStorageMedia('hero-background-mobile.webp'),

  portraitFounder: siteStorageMedia('portrait-founder.webp'),
  /** کارت «درباره بهرام» در صفحه اصلی — جدا از هیرو صفحه بنیان‌گذار */
  founderAsidePortrait: siteStorageMedia('founder-aside-portrait.webp'),
  /** هیرو صفحه بنیان‌گذار — دسکتاپ */
  founderHeroDesktop: siteStorageMedia('founder-hero-desktop.webp'),
  /** هیرو صفحه بنیان‌گذار — موبایل (۹:۱۶) */
  portraitFounderMobile: siteStorageMedia('portrait-founder-mobile.webp'),
  /** پس‌زمینه کارت نامه بنیان‌گذار */
  founderLetter: siteStorageMedia('founder-letter.webp'),
  mainPathCampaign: siteStorageMedia('main-path-campaign.webp'),
  mainPathSaat: siteStorageMedia('main-path-saat.webp'),
  squareStudio: siteStorageMedia('square-studio.jpg'),
  landscapeSession: siteStorageMedia('landscape-session.webp'),
  /** هیرو دوره کمپین‌نویسی — موبایل (۹:۱۶) */
  campaignWritingHeroMobile: siteStorageMedia('campaign-writing-hero-mobile.webp'),
  social: [
    siteStorageMedia('social-01.jpg'),
    siteStorageMedia('social-02.jpg'),
    siteStorageMedia('social-03.jpg'),
    siteStorageMedia('social-04.jpg'),
    siteStorageMedia('social-05.jpg'),
    siteStorageMedia('social-06.jpg'),
  ],
  manifestoPortraitA: siteStorageMedia('manifesto-portrait-a.jpg'),
  manifestoPortraitB: siteStorageMedia('manifesto-portrait-b.jpg'),
  manifestoLandscape: siteStorageMedia('manifesto-landscape.webp'),
  ctaPortrait: siteStorageMedia('cta-portrait.jpg'),
  ctaSquare: siteStorageMedia('cta-square.jpg'),
  testimonialPortrait: [
    siteStorageMedia('testimonial-01.webp'),
    siteStorageMedia('testimonial-02.webp'),
    siteStorageMedia('testimonial-03.webp'),
    siteStorageMedia('testimonial-04.webp'),
  ],
  academyStory: siteStorageMedia('academy-story.webp'),
  academyAccent: siteStorageMedia('academy-accent.jpg'),
  /** پیش‌نمایش مینی‌اپ سات در بنر آکادمی */
  academyAppHome: siteStorageMedia('academy-app-home.webp'),
  academyAppPath: siteStorageMedia('story-step-02.webp'),
  academyAppAtelier: siteStorageMedia('square-backstage.webp'),
  squareBackstage: siteStorageMedia('square-backstage.webp'),
  courseBackstage: siteStorageMedia('course-backstage.webp'),
  /** ویدیوی خوش‌آمد چت‌بات — آپلود در کتابخانه رسانه */
  chatbotWelcomeVideo: siteStorageMedia('chatbot-welcome.mp4'),
  storyStep: [
    siteStorageMedia('story-step-01.webp'),
    siteStorageMedia('story-step-02.webp'),
    siteStorageMedia('story-step-03.webp'),
    siteStorageMedia('story-step-04.webp'),
    siteStorageMedia('story-step-05.webp'),
  ],
} as const;

/** کاور کارت‌ها و جزئیات بلاگ — همان عکس‌های اصلی سایت، چیده‌شده برای تنوع اندیس */
export const insightCoverPhotos = [
  sitePhotos.storyStep[0]!,
  sitePhotos.storyStep[1]!,
  sitePhotos.storyStep[2]!,
  sitePhotos.storyStep[3]!,
  sitePhotos.manifestoLandscape,
  sitePhotos.manifestoPortraitA,
  sitePhotos.manifestoPortraitB,
  sitePhotos.courseBackstage,
  sitePhotos.squareBackstage,
  sitePhotos.landscapeSession,
] as const;

/** کاور لیست و جزئیات رویدادها */
export const eventCoverPhotos = [
  sitePhotos.manifestoLandscape,
  sitePhotos.landscapeSession,
  sitePhotos.courseBackstage,
  sitePhotos.squareStudio,
  sitePhotos.academyStory,
  sitePhotos.academyAccent,
  sitePhotos.social[0]!,
  sitePhotos.social[1]!,
  sitePhotos.social[2]!,
  sitePhotos.social[3]!,
] as const;

/** کاور کارت‌های دوره‌ها */
export const courseCoverPhotos = [
  sitePhotos.courseBackstage,
  sitePhotos.squareStudio,
  sitePhotos.manifestoLandscape,
  sitePhotos.landscapeSession,
  sitePhotos.storyStep[0]!,
  sitePhotos.storyStep[1]!,
  sitePhotos.storyStep[2]!,
  sitePhotos.storyStep[3]!,
  sitePhotos.squareBackstage,
  sitePhotos.manifestoPortraitA,
] as const;

/** کاور منابع و راهنماها */
export const resourceCoverPhotos = [
  sitePhotos.storyStep[1]!,
  sitePhotos.storyStep[3]!,
  sitePhotos.squareStudio,
  sitePhotos.courseBackstage,
  sitePhotos.manifestoLandscape,
  sitePhotos.landscapeSession,
  sitePhotos.manifestoPortraitB,
  sitePhotos.squareBackstage,
  sitePhotos.storyStep[0]!,
  sitePhotos.storyStep[2]!,
] as const;

/** پس‌زمینه‌ی سکشن‌های قهرمان با عکس واقعی */
export const pageHeroBackdropPhoto = sitePhotos.landscapeSession;
/** هیرو دوره کمپین‌نویسی — موبایل (۹:۱۶) */
export const pageHeroBackdropPhotoMobile = sitePhotos.campaignWritingHeroMobile;

const caseStudyPortraitBySlugInner = {
  'sara-r': sitePhotos.testimonialPortrait[0]!,
  'amir-h': sitePhotos.testimonialPortrait[2]!,
  'nazanin-k': sitePhotos.testimonialPortrait[1]!,
  'reza-m': sitePhotos.testimonialPortrait[3]!,
} as const;

/** استخر پرتره‌ها برای داستان‌هایی که نگاشتِ اختصاصی ندارند (انتخاب قطعی بر اساس slug) */
const caseStudyPortraitPool = [
  sitePhotos.testimonialPortrait[0]!,
  sitePhotos.testimonialPortrait[1]!,
  sitePhotos.testimonialPortrait[2]!,
  sitePhotos.testimonialPortrait[3]!,
  sitePhotos.social[0]!,
  sitePhotos.social[1]!,
  sitePhotos.social[2]!,
  sitePhotos.social[3]!,
  sitePhotos.social[4]!,
  sitePhotos.social[5]!,
  sitePhotos.squareStudio,
] as const;

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/** پرتره‌ی هماهنگ با بلوک نظرهای صفحه‌ی خانه */
export function caseStudyPortrait(slug: string): string {
  const fromMap = caseStudyPortraitBySlugInner[slug as keyof typeof caseStudyPortraitBySlugInner];
  if (fromMap) return fromMap;
  return caseStudyPortraitPool[hashSlug(slug) % caseStudyPortraitPool.length]!;
}
