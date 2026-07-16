/// Persian display labels — must stay in sync with the backend enums under
/// `backend/app/Enums/Family/*.php`.
library labels;

const Map<String, String> postTypeLabels = {
  'text': 'متنی',
  'voice': 'صوتی',
  'video': 'ویدیویی',
  'image': 'تصویری',
  'image_album': 'آلبوم تصویر',
  'article': 'مقاله',
  'mixed': 'ترکیبی',
  'reply': 'پاسخ بهرام',
};

const Map<String, String> postStatusLabels = {
  'draft': 'پیش‌نویس',
  'published': 'منتشرشده',
  'archived': 'آرشیوشده',
};

const Map<String, String> audienceModeLabels = {
  'all': 'همه خانواده‌ها',
  'include': 'فقط خانواده‌های انتخابی',
  'exclude': 'همه به‌جز خانواده‌های انتخابی',
};

const Map<String, String> mediaTypeLabels = {
  'voice': 'صوت',
  'video': 'ویدیو',
  'image': 'تصویر',
};

const Map<String, String> mediaStatusLabels = {
  'uploading': 'در حال آپلود',
  'queued': 'در صف انتقال',
  'transferring': 'در حال انتقال به CDN',
  'processing': 'در حال پردازش',
  'ready': 'آماده',
  'failed': 'خطا',
};

const Map<String, String> commentStatusLabels = {
  'pending': 'در انتظار تأیید',
  'approved': 'تأییدشده',
  'rejected': 'رد‌شده',
};

const Map<String, String> rejectionReasonLabels = {
  'contact_information': 'اطلاعات تماس',
  'advertisement': 'تبلیغاتی',
  'insult': 'توهین',
  'irrelevant': 'نامرتبط',
  'rule_violation': 'مغایر با قوانین',
  'other': 'سایر',
};

const Map<String, String> entrySourceLabels = {
  'instagram': 'اینستاگرام',
  'instagram_reel': 'ریلز اینستاگرام',
  'instagram_story': 'استوری اینستاگرام',
  'dm_automation': 'اتوماسیون دایرکت',
  'website': 'وب‌سایت',
  'article': 'مقاله',
  'seminar': 'سمینار',
  'campaign': 'کمپین',
  'direct': 'ورود مستقیم',
};

const Map<String, String> lifecycleLabels = {
  'forming': 'در حال تشکیل',
  'active': 'فعال',
  'cooling': 'کم‌فعال',
  'dormant': 'غیرفعال',
};

const Map<String, String> actionTypeLabels = {
  'commitment': 'تعهد',
  'confirmation': 'تأیید',
  'number': 'عدد',
  'single_choice': 'انتخاب تکی',
  'multi_choice': 'انتخاب چندتایی',
  'short_text': 'متن کوتاه',
  'scale': 'طیف امتیاز',
};

String labelOf(Map<String, String> table, String key) => table[key] ?? key;
