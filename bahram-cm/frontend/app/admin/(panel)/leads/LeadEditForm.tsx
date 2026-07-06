'use client';

import { SERVICE_LABELS } from '@/lib/admin/leadDisplay';
import { unknownSelectOption, type LeadDraft } from '@/lib/admin/leadDraft';
import { formTypeLabel } from '@/lib/admin/formTypes';

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const extra = unknownSelectOption(value, options);

  return (
    <div>
      <label className="field-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
        disabled={disabled}
      >
        <option value="">—</option>
        {extra && <option value={extra.value}>{extra.label}</option>}
        {Object.entries(options).map(([key, optLabel]) => (
          <option key={key} value={key}>
            {optLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LeadEditForm({
  formType,
  draft,
  busy,
  onChange,
}: {
  formType: string | null;
  draft: LeadDraft;
  busy: boolean;
  onChange: (draft: LeadDraft) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">نام</label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="field-input"
          disabled={busy}
        />
      </div>
      <div>
        <label className="field-label">شماره تماس</label>
        <input
          value={draft.phone}
          onChange={(e) => onChange({ ...draft, phone: e.target.value })}
          className="field-input"
          dir="ltr"
          disabled={busy}
        />
      </div>
      <div>
        <label className="field-label">ایمیل</label>
        <input
          value={draft.email}
          onChange={(e) => onChange({ ...draft, email: e.target.value })}
          className="field-input"
          dir="ltr"
          disabled={busy}
        />
      </div>
      <SelectField
        label="موضوع / منبع"
        value={draft.treatmentTags}
        options={SERVICE_LABELS}
        onChange={(treatmentTags) => onChange({ ...draft, treatmentTags })}
        disabled={busy}
      />
      <div className="sm:col-span-2">
        <label className="field-label">پیام</label>
        <textarea
          value={draft.message}
          onChange={(e) => onChange({ ...draft, message: e.target.value })}
          className="field-input min-h-[88px] resize-y"
          rows={3}
          disabled={busy}
        />
      </div>
      <p className="sm:col-span-2 text-caption text-text-muted">
        نوع فرم: {formTypeLabel(formType)} — قابل تغییر نیست.
      </p>
    </div>
  );
}
