'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { Badge } from '../ui';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import {
  buildLeadSubmittedRows,
  SERVICE_LABELS,
} from '@/lib/admin/leadDisplay';
import { buildLeadDraft } from '@/lib/admin/leadDraft';
import { formTypeLabel } from '@/lib/admin/formTypes';
import { LEAD_STATUSES, leadStatusLabel } from '@/lib/admin/leadStatuses';
import { deleteLead, updateLead, updateLeadStatus } from './actions';
import { LeadEditForm } from './LeadEditForm';
import { LeadNotesPanel } from './LeadNotesPanel';
import type { LeadNoteItem } from './actions';
import type { LeadDraft } from '@/lib/admin/leadDraft';

function formatTreatmentInterest(value: string | string[] | null | undefined): string {
  if (!value) return '—';
  const items = Array.isArray(value) ? value : [value];
  const labels = items.map((item) => SERVICE_LABELS[item] ?? item).filter(Boolean);
  return labels.length ? labels.join('، ') : '—';
}

interface LeadView {
  id: number;
  name: string;
  phone: string;
  formType: string | null;
  treatmentTags: string | string[] | null;
  selection?: Record<string, unknown> | null;
  preferredContact?: string | null;
  budgetPref?: string | null;
  bestCallTime?: string | null;
  pageUrl?: string | null;
  source: string | null;
  statusName: string;
  statusLabel?: string | null;
  campaign: string | null;
  createdAt: string;
  answers: { questionKey: string; answerValue: string }[];
  notes: LeadNoteItem[];
  photos: { id: number; url: string }[];
  utm?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
  } | null;
}

export function LeadRow({ lead: initialLead, variant = 'row' }: { lead: LeadView; variant?: 'row' | 'card' }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LeadDraft>(() => buildLeadDraft(initialLead));
  const [status, setStatus] = useState(lead.statusName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(false);

  const submittedRows = useMemo(() => buildLeadSubmittedRows(lead), [lead]);

  if (removed) return null;

  async function updateStatus(next: string) {
    setStatus(next);
    setBusy(true);
    await updateLeadStatus(lead.id, next);
    setBusy(false);
  }

  function startEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    setDraft(buildLeadDraft(lead));
    setError('');
    setEditing(true);
    setOpen(true);
  }

  function cancelEdit() {
    setDraft(buildLeadDraft(lead));
    setError('');
    setEditing(false);
  }

  async function saveEdit() {
    setError('');
    setBusy(true);

    const res = await updateLead(lead.id, {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      treatment_tags: draft.treatmentTags || null,
      user_notes: draft.message.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'خطا در ذخیره');
      return;
    }

    setLead({
      ...lead,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      treatmentTags: draft.treatmentTags || null,
      answers: draft.message.trim()
        ? [{ questionKey: 'user_notes', answerValue: draft.message.trim() }]
        : lead.answers,
    });
    setEditing(false);
    router.refresh();
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`لید «${lead.name}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    setBusy(true);
    setError('');
    const res = await deleteLead(lead.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'خطا در حذف');
      return;
    }
    setRemoved(true);
    router.refresh();
  }

  const expandedPanel = open ? (
    <div className="grid gap-5 lg:grid-cols-3" onClick={(e) => e.stopPropagation()}>
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-small font-semibold text-primary-dark">
              {editing ? 'ویرایش اطلاعات' : 'اطلاعات ارسالی کاربر'}
            </p>
            {!editing ? (
              <button type="button" onClick={startEdit} className="btn btn-secondary px-3 py-1.5 text-caption">
                <Pencil className="h-3.5 w-3.5" />
                ویرایش
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={busy || !draft.name.trim() || !draft.phone.trim()}
                  className="btn btn-primary px-3 py-1.5 text-caption"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'ذخیره'}
                </button>
                <button type="button" onClick={cancelEdit} disabled={busy} className="btn btn-secondary px-3 py-1.5 text-caption">
                  <X className="h-3.5 w-3.5" />
                  انصراف
                </button>
              </div>
            )}
          </div>

          {error && <p className="mb-3 text-caption text-error">{error}</p>}

          {editing ? (
            <LeadEditForm formType={lead.formType} draft={draft} busy={busy} onChange={setDraft} />
          ) : (
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {submittedRows.map((row) => (
                <div key={row.label} className="min-w-0">
                  <dt className="text-caption text-text-muted">{row.label}</dt>
                  <dd className="mt-0.5 text-small font-medium text-text">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {lead.photos.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-caption font-semibold text-text-muted">عکس‌های پیوست</p>
              <div className="flex flex-wrap gap-2">
                {lead.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    <DirectMediaImg admin src={photo.url} alt="عکس لید" className="h-24 w-24 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="mb-2 text-caption font-semibold text-text-muted">منبع و ردیابی</p>
          <ul className="space-y-1 text-caption text-text">
            <li>
              <span className="text-text-muted">منبع:</span> {lead.source || 'organic'}
            </li>
            {lead.pageUrl && (
              <li>
                <span className="text-text-muted">صفحه:</span> {lead.pageUrl}
              </li>
            )}
            {lead.campaign && (
              <li>
                <span className="text-text-muted">کمپین:</span> {lead.campaign}
              </li>
            )}
            {lead.utm?.source && (
              <li>
                <span className="text-text-muted">UTM source:</span> {lead.utm.source}
              </li>
            )}
            {lead.utm?.medium && (
              <li>
                <span className="text-text-muted">UTM medium:</span> {lead.utm.medium}
              </li>
            )}
            {lead.utm?.campaign && (
              <li>
                <span className="text-text-muted">UTM campaign:</span> {lead.utm.campaign}
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-caption font-semibold text-text-muted">تغییر وضعیت</p>
          <select value={status} onChange={(e) => updateStatus(e.target.value)} className="field-input" disabled={busy}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <LeadNotesPanel leadId={lead.id} initialNotes={lead.notes} />

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="btn btn-ghost w-full justify-center px-3 py-2 text-caption text-error hover:bg-error/5"
          >
            <Trash2 className="h-4 w-4" />
            حذف این لید
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (variant === 'card') {
    return (
      <AdminTableCard
        title={lead.name}
        fields={[
          { label: 'تلفن', value: lead.phone, mono: true },
          { label: 'نوع فرم', value: <Badge tone="accent">{formTypeLabel(lead.formType)}</Badge> },
          { label: 'علاقه', value: formatTreatmentInterest(lead.treatmentTags) },
          {
            label: 'وضعیت',
            value: (
              <Badge tone={status === 'WON' ? 'success' : status === 'LOST' ? 'warning' : 'default'}>
                {leadStatusLabel(status, lead.statusLabel)}
              </Badge>
            ),
          },
          { label: 'تاریخ', value: new Date(lead.createdAt).toLocaleDateString('fa-IR') },
        ]}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-accent hover:text-primary"
              disabled={busy}
            >
              <Pencil className="h-4 w-4" />
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-text-muted hover:text-text"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? 'بستن' : 'جزئیات'}
            </button>
          </div>
        }
        expanded={expandedPanel ?? undefined}
        onClick={() => setOpen((v) => !v)}
      />
    );
  }

  return (
    <>
      <tr className="cursor-pointer hover:bg-surface-soft/50" onClick={() => setOpen((v) => !v)}>
        <td className="px-4 py-3 font-medium text-text">{lead.name}</td>
        <td className="px-4 py-3 text-text-muted" dir="ltr">
          {lead.phone}
        </td>
        <td className="px-4 py-3">
          <Badge tone="accent">{formTypeLabel(lead.formType)}</Badge>
        </td>
        <td className="px-4 py-3 text-text-muted">{formatTreatmentInterest(lead.treatmentTags)}</td>
        <td className="px-4 py-3">
          <Badge tone={status === 'WON' ? 'success' : status === 'LOST' ? 'warning' : 'default'}>
            {leadStatusLabel(status, lead.statusLabel)}
          </Badge>
        </td>
        <td className="px-4 py-3 text-text-muted">{new Date(lead.createdAt).toLocaleDateString('fa-IR')}</td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              className="btn btn-ghost px-2 py-1.5 text-text-muted hover:text-primary"
              title="ویرایش"
              disabled={busy}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-ghost px-2 py-1.5 text-text-muted hover:text-error"
              title="حذف"
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <ChevronDown
              className={`h-4 w-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
              onClick={() => setOpen((v) => !v)}
            />
          </div>
        </td>
      </tr>
      {open && expandedPanel ? (
        <tr>
          <td colSpan={7} className="bg-surface-soft/40 px-4 py-5">
            {expandedPanel}
          </td>
        </tr>
      ) : null}
    </>
  );
}
