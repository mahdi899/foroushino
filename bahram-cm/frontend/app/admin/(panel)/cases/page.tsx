'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import { AdminPage } from '../ui';
import { ImageUrlField } from '../content/ImageUrlField';
import { createCase, getAdminCases, updateCase } from '../content/actions';
import { PUBLIC_API_URL } from '@/lib/api/config';
import type { ApiCase, ApiService } from '@/lib/api/types';

type CaseDraft = {
  title: string;
  summary: string;
  before_url: string;
  after_url: string;
  service_id: number | '';
};

const CASE_PREVIEW_CLASS =
  'relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-surface-soft';

function emptyDraft(): CaseDraft {
  return { title: '', summary: '', before_url: '', after_url: '', service_id: '' };
}

function draftFromCase(c: ApiCase): CaseDraft {
  return {
    title: c.title,
    summary: c.summary ?? '',
    before_url: c.before_url ?? '',
    after_url: c.after_url ?? '',
    service_id: c.service?.id ?? '',
  };
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | 'new' | null>(null);
  const [drafts, setDrafts] = useState<Record<number, CaseDraft>>({});
  const [newDraft, setNewDraft] = useState<CaseDraft | null>(null);

  const loadCases = useCallback(async () => {
    const data = await getAdminCases();
    setCases(data);
    const initial: Record<number, CaseDraft> = {};
    data.forEach((c) => {
      initial[c.id] = draftFromCase(c);
    });
    setDrafts(initial);
  }, []);

  useEffect(() => {
    Promise.all([
      loadCases(),
      fetch(`${PUBLIC_API_URL}/services`)
        .then((r) => r.json())
        .then((json) => setServices(json.data ?? json ?? []))
        .catch(() => setServices([])),
    ]).finally(() => setLoading(false));
  }, [loadCases]);

  function patchDraft(id: number, patch: Partial<CaseDraft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function saveExisting(c: ApiCase) {
    const draft = drafts[c.id];
    if (!draft?.title.trim()) return;
    setSavingId(c.id);
    await updateCase(c.id, {
      title: draft.title.trim(),
      summary: draft.summary.trim() || undefined,
      before_url: draft.before_url || undefined,
      after_url: draft.after_url || undefined,
      service_id: draft.service_id === '' ? null : draft.service_id,
    });
    await loadCases();
    setSavingId(null);
  }

  async function saveNew() {
    if (!newDraft?.title.trim()) return;
    setSavingId('new');
    const created = await createCase({
      title: newDraft.title.trim(),
      summary: newDraft.summary.trim() || undefined,
      before_url: newDraft.before_url || undefined,
      after_url: newDraft.after_url || undefined,
      service_id: newDraft.service_id === '' ? null : newDraft.service_id,
    });
    if (created) {
      setNewDraft(null);
      await loadCases();
    }
    setSavingId(null);
  }

  function renderEditor(
    draft: CaseDraft,
    onPatch: (patch: Partial<CaseDraft>) => void,
    onSave: () => void,
    saving: boolean,
    onCancel?: () => void,
  ) {
    const titleForAlt = draft.title.trim() || 'نمونه کار';

    return (
      <>
        <div className="mb-4 grid gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="field-label">عنوان</label>
              <input
                className="field-input font-semibold"
                value={draft.title}
                onChange={(e) => onPatch({ title: e.target.value })}
                placeholder="مثلاً بازسازی لبخند با ایمپلنت"
              />
            </div>
            <div className="w-full shrink-0 sm:w-52">
              <label className="field-label">خدمت مرتبط</label>
              <select
                className="field-input text-small"
                value={draft.service_id === '' ? '' : String(draft.service_id)}
                onChange={(e) =>
                  onPatch({ service_id: e.target.value ? Number(e.target.value) : '' })
                }
              >
                <option value="">— انتخاب خدمت —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title_fa}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">توضیحات</label>
            <textarea
              className="field-input min-h-[5rem] text-small"
              value={draft.summary}
              onChange={(e) => onPatch({ summary: e.target.value })}
              placeholder="خلاصه کوتاه درباره این نمونه کار…"
            />
          </div>
        </div>

        <div className="mb-4 grid items-start gap-4 sm:grid-cols-2">
          <ImageUrlField
            label="تصویر قبل"
            value={draft.before_url}
            onChange={(url) => onPatch({ before_url: url })}
            alt={`${titleForAlt} قبل`}
            previewClassName={CASE_PREVIEW_CLASS}
          />
          <ImageUrlField
            label="تصویر بعد"
            value={draft.after_url}
            onChange={(url) => onPatch({ after_url: url })}
            alt={`${titleForAlt} بعد`}
            previewClassName={CASE_PREVIEW_CLASS}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !draft.title.trim()}
            className="btn btn-primary px-4 py-2 text-small"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-secondary px-4 py-2 text-small">
              <X className="h-4 w-4" />
              انصراف
            </button>
          )}
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <AdminPage title="نمونه کارها" desc="تصاویر قبل/بعد">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="نمونه کارها"
      desc="عنوان، توضیحات و تصاویر قبل/بعد — تغییرات در کل سایت اعمال می‌شود"
      action={
        !newDraft ? (
          <button
            type="button"
            onClick={() => setNewDraft(emptyDraft())}
            className="btn btn-primary px-4 py-2 text-small"
          >
            <Plus className="h-4 w-4" />
            افزودن نمونه کار
          </button>
        ) : null
      }
    >
      <div className="space-y-6">
        {newDraft && (
          <div className="card border-2 border-dashed border-primary/30 p-5">
            <p className="mb-4 text-small font-semibold text-primary-dark">نمونه کار جدید</p>
            {renderEditor(
              newDraft,
              (patch) => setNewDraft((d) => (d ? { ...d, ...patch } : d)),
              () => void saveNew(),
              savingId === 'new',
              () => setNewDraft(null),
            )}
          </div>
        )}

        {!cases.length && !newDraft && (
          <div className="card p-8 text-center text-small text-text-muted">
            هنوز نمونه کاری ثبت نشده. «افزودن نمونه کار» را بزنید.
          </div>
        )}

        {cases.map((c) => {
          const draft = drafts[c.id];
          if (!draft) return null;

          return (
            <div key={c.id} className="card p-5">
              <p className="mb-4 text-caption text-text-muted">
                {c.service?.title_fa ?? c.service_slug ?? 'بدون خدمت'}
                {c.slug ? ` · /cases/${c.slug}` : ''}
              </p>
              {renderEditor(
                draft,
                (patch) => patchDraft(c.id, patch),
                () => void saveExisting(c),
                savingId === c.id,
              )}
            </div>
          );
        })}
      </div>
    </AdminPage>
  );
}
