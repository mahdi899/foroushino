/** Contextual guest gates — one message per locked action. */
export type FamilyGuestAction = 'stories' | 'morePosts' | 'comment' | 'react';

export const FAMILY_GUEST_CTA = 'عضو خانواده بشین';

export const FAMILY_GATE_JOIN_CTA = 'عضویت رایگان در خانواده';

export const FAMILY_GATE_TRUST = 'رایگان · کمتر از یک دقیقه · بدون نیاز به کارت بانکی';

export const FAMILY_GATE_FEATURES = [
  'آلبوم کامل عکس و ویدیو',
  'دسترسی به همهٔ پست‌ها',
  'شرکت در گفتگوها',
  'ثبت و اشتراک خاطره',
] as const;

export const FAMILY_GATE_COPY = {
  guest: {
    headlineBefore: 'خاطرات بیشتری ',
    headlineAccent: 'در انتظار شماست',
    lede:
      'تو خانواده داداش بهرام هممون باهم رشد می‌کنیم. جا محدوده. همین الان عضو شو که جا نمونی.',
  },
  join: {
    headlineBefore: 'دسترسی کامل به ',
    headlineAccent: 'خاطرات خانواده',
    lede:
      'تو خانواده داداش بهرام هممون باهم رشد می‌کنیم. جا محدوده. همین الان بپیوند که جا نمونی.',
  },
} as const;

/** Guest feed: total posts returned by API. */
export const GUEST_PREVIEW_POST_COUNT = 6;

/** Top (oldest) N posts in the guest preview are blurred. */
export const GUEST_BLURRED_POST_COUNT = 2;

export const GUEST_BLURRED_POST_MESSAGE = 'عضویت باید انجام بدید';

export const FAMILY_GUEST_PROMPTS: Record<FamilyGuestAction, string> = {
  stories: 'برای دیدن استوری‌ها عضو خانواده بشین',
  morePosts: 'برای دیدن پست‌های بیشتر عضو خانواده بشین',
  comment: 'برای کامنت گذاشتن عضو خانواده بشین',
  react: 'برای واکنش دادن عضو خانواده بشین',
};
