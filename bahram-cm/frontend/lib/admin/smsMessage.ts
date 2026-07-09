export const SMS_OPT_OUT_SUFFIX = 'لغو11';

export const SMS_OPT_OUT_ERROR = '(لغو11) رو انتهای پیام نزاشتی';

export const SMS_OPT_OUT_HINT = 'برای ارسال، انتهای متن باید «لغو11» باشد.';

export function hasSmsOptOutSuffix(message: string): boolean {
  return message.trimEnd().endsWith(SMS_OPT_OUT_SUFFIX);
}
