/** Persian labels for lead form_type values from the public site. */
export const FORM_TYPE_LABELS: Record<string, string> = {
  contact: 'تماس با ما',
  service: 'صفحه خدمات',
  consultation: 'مشاوره هوشمند',
  pricing: 'مشاور قیمت',
  blog: 'مقاله',
  case: 'نمونه کار',
  doctor: 'پروفایل پزشک',
  landing: 'لندینگ',
  local_appointment: 'رزرو نوبت (صفحه اصلی)',
  chatbot: 'چت‌بات',
};

export function formTypeLabel(type: string | null | undefined): string {
  if (!type) return 'عمومی';
  return FORM_TYPE_LABELS[type] ?? type;
}

export const FORM_TYPE_FILTERS = [
  { value: '', label: 'همه' },
  { value: 'contact', label: 'تماس' },
  { value: 'service', label: 'خدمات' },
  { value: 'consultation', label: 'مشاوره' },
  { value: 'pricing', label: 'قیمت‌گذاری' },
  { value: 'chatbot', label: 'چت‌بات' },
  { value: 'local_appointment', label: 'رزرو نوبت' },
  { value: 'blog', label: 'مقاله' },
  { value: 'case', label: 'نمونه کار' },
  { value: 'landing', label: 'لندینگ' },
];
