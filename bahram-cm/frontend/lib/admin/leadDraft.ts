import { SERVICE_LABELS, type LeadDisplayInput } from '@/lib/admin/leadDisplay';

export interface LeadDraftSource extends LeadDisplayInput {
  formType: string | null;
  selection?: Record<string, unknown> | null;
}

export interface LeadDraft {
  name: string;
  phone: string;
  email: string;
  message: string;
  treatmentTags: string;
}

export const consultationQuestions: { key: string; question: string; options: { value: string; label: string }[] }[] = [];

/** Map stored label or key back to option key for controlled selects. */
export function normalizeOptionKey(
  raw: string | null | undefined,
  options: Record<string, string>,
): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (options[trimmed]) return trimmed;

  const byLabel = Object.entries(options).find(([, label]) => label === trimmed);
  if (byLabel) return byLabel[0];

  return trimmed;
}

function treatmentTagsFromLead(lead: LeadDraftSource): string {
  if (!lead.treatmentTags) return '';
  const raw = Array.isArray(lead.treatmentTags) ? lead.treatmentTags[0] : lead.treatmentTags;
  return normalizeOptionKey(raw, SERVICE_LABELS);
}

export function buildLeadDraft(lead: LeadDraftSource): LeadDraft {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? '',
    message: lead.message ?? lead.answers.find((a) => a.questionKey === 'user_notes')?.answerValue ?? '',
    treatmentTags: treatmentTagsFromLead(lead),
  };
}

export function unknownSelectOption(
  value: string,
  options: Record<string, string>,
): { value: string; label: string } | null {
  if (!value || options[value]) return null;
  return { value, label: value };
}
