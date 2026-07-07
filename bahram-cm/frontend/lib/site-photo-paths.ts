/**
 * مرکز پوشه‌ی عکس‌های سایت — مسیرهای portable نگه داشته می‌شوند تا
 * ابتدا از `/public/media` (سریع) و در صورت نیاز از Laravel CDN لود شوند.
 */
export const sitePhotos = {
  portraitFounder: "/media/site-photos/portrait-founder.jpg",
  squareStudio: "/media/site-photos/square-studio.jpg",
  landscapeSession: "/media/site-photos/landscape-session.jpg",
  social: [
    "/media/site-photos/social-01.jpg",
    "/media/site-photos/social-02.jpg",
    "/media/site-photos/social-03.jpg",
    "/media/site-photos/social-04.jpg",
    "/media/site-photos/social-05.jpg",
    "/media/site-photos/social-06.jpg",
  ],
  manifestoPortraitA: "/media/site-photos/manifesto-portrait-a.jpg",
  manifestoPortraitB: "/media/site-photos/manifesto-portrait-b.jpg",
  manifestoLandscape: "/media/site-photos/manifesto-landscape.jpg",
  ctaPortrait: "/media/site-photos/cta-portrait.jpg",
  ctaSquare: "/media/site-photos/cta-square.jpg",
  testimonialPortrait: [
    "/media/site-photos/testimonial-01.jpg",
    "/media/site-photos/testimonial-02.jpg",
    "/media/site-photos/testimonial-03.jpg",
  ],
  academyStory: "/media/site-photos/academy-story.jpg",
  academyAccent: "/media/site-photos/academy-accent.jpg",
  academyAppHome: "/media/site-photos/academy-story.jpg",
  academyAppPath: "/media/site-photos/story-step-02.jpg",
  academyAppAtelier: "/media/site-photos/square-backstage.jpg",
  squareBackstage: "/media/site-photos/square-backstage.jpg",
  courseBackstage: "/media/site-photos/course-backstage.jpg",
  storyStep: [
    "/media/site-photos/story-step-01.jpg",
    "/media/site-photos/story-step-02.jpg",
    "/media/site-photos/story-step-03.jpg",
    "/media/site-photos/story-step-04.jpg",
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

const caseStudyPortraitBySlugInner = {
  "sara-r": sitePhotos.testimonialPortrait[0]!,
  "amir-h": sitePhotos.testimonialPortrait[1]!,
  "nazanin-k": sitePhotos.testimonialPortrait[2]!,
  "reza-m": sitePhotos.social[3]!,
} as const;

/** استخر پرتره‌ها برای داستان‌هایی که نگاشتِ اختصاصی ندارند (انتخاب قطعی بر اساس slug) */
const caseStudyPortraitPool = [
  sitePhotos.testimonialPortrait[0]!,
  sitePhotos.testimonialPortrait[1]!,
  sitePhotos.testimonialPortrait[2]!,
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
