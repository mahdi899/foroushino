import { siteStorageMedia } from '@/config/media';



/**

 * Site photo paths — canonical gallery storage (`/storage/media/site/*`).

 * Managed via admin gallery; legacy `/media/*` URLs redirect here.

 */

export const sitePhotos = {

  heroBackground: '/storage/media/2026/07/01kwwk4bm4900qv599k0qxw4mw.jpg',

  heroBackgroundMobile: '/storage/media/2026/07/01kwwk58kyxqdhn3vz6aaz5610.jpg',

  /** @deprecated use heroBackground */

  heroLightGrid: '/storage/media/2026/07/01kwwk4bm4900qv599k0qxw4mw.jpg',

  /** @deprecated use heroBackgroundMobile */

  heroLightGridMobile: '/storage/media/2026/07/01kwwk58kyxqdhn3vz6aaz5610.jpg',

  portraitFounder: siteStorageMedia('portrait-founder.webp'),

  mainPathCampaign: siteStorageMedia('main-path-campaign.webp'),

  mainPathSaat: siteStorageMedia('main-path-saat.webp'),

  squareStudio: siteStorageMedia('square-studio.jpg'),

  landscapeSession: siteStorageMedia('landscape-session.webp'),

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

  academyAppHome: siteStorageMedia('academy-story.webp'),

  academyAppPath: siteStorageMedia('story-step-02.webp'),

  academyAppAtelier: siteStorageMedia('square-backstage.webp'),

  squareBackstage: siteStorageMedia('square-backstage.webp'),

  courseBackstage: siteStorageMedia('course-backstage.webp'),

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



const caseStudyPortraitBySlugInner = {

  "sara-r": sitePhotos.testimonialPortrait[0]!,

  "amir-h": sitePhotos.testimonialPortrait[1]!,

  "nazanin-k": sitePhotos.testimonialPortrait[2]!,

  "reza-m": sitePhotos.testimonialPortrait[3]!,

  "kaveh-s": sitePhotos.social[0]!,

  "mahsa-t": sitePhotos.social[1]!,

  "parisa-n": sitePhotos.social[2]!,

  "omid-j": sitePhotos.social[3]!,

  "shabnam-a": sitePhotos.social[4]!,

  "niloofar-d": sitePhotos.social[5]!,

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


