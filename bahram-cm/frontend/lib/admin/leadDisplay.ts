import { formTypeLabel } from '@/lib/admin/formTypes';

export const SERVICE_LABELS: Record<string, string> = {
  campaign: 'کمپین‌نویسی',
  saat: 'سات',
  course: 'دوره آموزشی',
  apply: 'درخواست دسترسی',
  newsletter: 'خبرنامه',
  other: 'سایر',
};

export const SOURCE_LABELS: Record<string, string> = {
  web_apply: 'درخواست دسترسی',
  web_contact: 'تماس با ما',
  web_newsletter: 'خبرنامه',
  website: 'سایت',
  chatbot: 'چت‌بات',
};

export interface LeadDisplayInput {
  name: string;
  phone: string;
  formType: string | null;
  treatmentTags: string | string[] | null;
  selection?: Record<string, unknown> | null;
  preferredContact?: string | null;
  budgetPref?: string | null;
  bestCallTime?: string | null;
  message?: string | null;
  email?: string | null;
  answers: { questionKey: string; answerValue: string }[];
}

export interface LeadDisplayRow {
  label: string;
  value: string;
}

function formatService(value: string | string[] | null | undefined): string | null {
  if (!value) return null;
  const items = Array.isArray(value) ? value : [value];
  const labels = items.map((item) => SERVICE_LABELS[item.trim()] ?? item.trim()).filter(Boolean);
  return labels.length ? labels.join('، ') : null;
}

/** Human-readable rows for everything the visitor submitted. */
export function buildLeadSubmittedRows(lead: LeadDisplayInput): LeadDisplayRow[] {
  const rows: LeadDisplayRow[] = [
    { label: 'نوع فرم', value: formTypeLabel(lead.formType) },
    { label: 'نام', value: lead.name },
    { label: 'شماره تماس', value: lead.phone },
  ];

  if (lead.email) rows.push({ label: 'ایمیل', value: lead.email });

  const service = formatService(lead.treatmentTags);
  if (service) rows.push({ label: 'علاقه / موضوع', value: service });

  if (lead.message) rows.push({ label: 'پیام', value: lead.message });

  for (const answer of lead.answers) {
    rows.push({ label: answer.questionKey, value: answer.answerValue });
  }

  return rows;
}
