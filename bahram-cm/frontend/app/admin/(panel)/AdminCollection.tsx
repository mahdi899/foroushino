'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { AdminPage, PersistNotice, Table, Badge } from './ui';
import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  inList?: boolean; // show as a column in the table
  badge?: boolean;
}

export interface CollectionProps {
  title: string;
  desc?: string;
  collectionKey: string; // persisted under site_settings('content:<key>')
  fields: FieldDef[];
  idKey: string; // unique key field (e.g. 'slug')
  seed: Record<string, unknown>[];
}

// Reusable admin CRUD for content collections. Edits persist as overrides in
// site_settings('content:<key>'); the public site binds to these in production.
export function AdminCollection({ title, desc, collectionKey, fields, idKey, seed }: CollectionProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>(seed);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved'>('idle');

  const columns = useMemo(() => fields.filter((f) => f.inList), [fields]);

  useEffect(() => {
    getSettingBlob<Record<string, unknown>[]>('content', collectionKey)
      .then((value) => {
        if (Array.isArray(value) && value.length) setItems(value);
      })
      .catch(() => {});
  }, [collectionKey]);

  async function persist(next: Record<string, unknown>[]) {
    setItems(next);
    setStatus('loading');
    await saveSettingBlob('content', collectionKey, next).catch(() => {});
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 1500);
  }

  function save() {
    if (!editing) return;
    const id = editing[idKey];
    const exists = items.some((it) => it[idKey] === id);
    const next = exists ? items.map((it) => (it[idKey] === id ? editing : it)) : [...items, editing];
    persist(next);
    setEditing(null);
    setIsNew(false);
  }

  function remove(id: unknown) {
    persist(items.filter((it) => it[idKey] !== id));
  }

  function startNew() {
    const blank: Record<string, unknown> = {};
    fields.forEach((f) => (blank[f.key] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : ''));
    setEditing(blank);
    setIsNew(true);
  }

  return (
    <AdminPage
      title={title}
      desc={desc}
      action={
        <button onClick={startNew} className="btn btn-primary px-4 py-2 text-small">
          <Plus className="h-4 w-4" /> افزودن
        </button>
      }
    >
      <PersistNotice />
      {status === 'saved' && <p className="mb-3 text-small text-success">تغییرات ذخیره شد.</p>}

      <Table head={[...columns.map((c) => c.label), 'عملیات']}>
        {items.map((it, i) => (
          <tr key={String(it[idKey] ?? i)} className="hover:bg-surface-soft/40">
            {columns.map((c) => (
              <td key={c.key} className="max-w-xs truncate px-4 py-3 text-text">
                {c.badge ? (
                  <Badge tone="accent">{String(it[c.key] ?? '—')}</Badge>
                ) : c.type === 'boolean' ? (
                  it[c.key] ? <Badge tone="success">بله</Badge> : <Badge>خیر</Badge>
                ) : (
                  String(it[c.key] ?? '—')
                )}
              </td>
            ))}
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => { setEditing({ ...it }); setIsNew(false); }} className="inline-flex items-center gap-1 text-accent hover:text-primary">
                  <Pencil className="h-4 w-4" /> ویرایش
                </button>
                <button onClick={() => remove(it[idKey])} className="inline-flex items-center gap-1 text-error/80 hover:text-error">
                  <Trash2 className="h-4 w-4" /> حذف
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto admin-overlay p-4">
          <div className="my-8 w-full max-w-2xl rounded-xl bg-surface p-6 shadow-premium">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-h3 text-primary-dark">{isNew ? 'افزودن مورد جدید' : 'ویرایش'}</h2>
              <button onClick={() => setEditing(null)} aria-label="بستن"><X className="h-5 w-5 text-text-muted" /></button>
            </div>
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto pl-1">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="field-label">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={String(editing[f.key] ?? '')}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      rows={3}
                      className="field-input"
                    />
                  ) : f.type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-small text-text">
                      <input
                        type="checkbox"
                        checked={Boolean(editing[f.key])}
                        onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      فعال
                    </label>
                  ) : f.type === 'select' ? (
                    <select
                      value={String(editing[f.key] ?? '')}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className="field-input"
                    >
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={String(editing[f.key] ?? '')}
                      onChange={(e) =>
                        setEditing({ ...editing, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })
                      }
                      className="field-input"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn btn-secondary px-4 py-2 text-small">انصراف</button>
              <button onClick={save} className="btn btn-primary px-4 py-2 text-small">
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
