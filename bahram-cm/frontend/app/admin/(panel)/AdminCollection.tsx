'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { AdminPersistBanner } from '@/components/admin/layout/AdminPersistBanner';
import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';
import { AdminPage, StatCard } from './ui';
import { AdminCollectionRows } from './AdminCollectionRows';

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  inList?: boolean;
  badge?: boolean;
}

export interface CollectionProps {
  title: string;
  desc?: string;
  icon?: string;
  headerVariant?: AdminPageHeaderVariant;
  collectionKey: string;
  fields: FieldDef[];
  idKey: string;
  seed: Record<string, unknown>[];
  emptyTitle?: string;
  emptyDescription?: string;
}
import type { AdminPageHeaderVariant } from '@/components/admin/layout/AdminPageHeader';

function countActiveItems(items: Record<string, unknown>[], fields: FieldDef[]) {
  const flag = fields.find(
    (f) =>
      f.type === 'boolean' &&
      (f.key === 'active' || f.key === 'visible' || f.key === 'indexable' || f.key === 'priority' || f.key.endsWith('Enabled')),
  );
  if (!flag) return null;
  return items.filter((it) => Boolean(it[flag.key])).length;
}

export function AdminCollection({
  title,
  desc,
  icon,
  headerVariant = 'default',
  collectionKey,
  fields,
  idKey,
  seed,
  emptyTitle,
  emptyDescription,
}: CollectionProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>(seed);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved'>('idle');

  const columns = useMemo(() => fields.filter((f) => f.inList), [fields]);
  const activeCount = useMemo(() => countActiveItems(items, fields), [items, fields]);

  const sortedItems = useMemo(() => {
    const orderField = fields.find((f) => f.key === 'order' && f.type === 'number');
    if (!orderField) return items;
    return [...items].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  }, [items, fields]);

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
    fields.forEach((f) => {
      blank[f.key] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : '';
    });
    setEditing(blank);
    setIsNew(true);
  }

  const panelSummary = (
    <>
      {items.length.toLocaleString('fa-IR')} مورد
      {activeCount !== null ? ` · ${activeCount.toLocaleString('fa-IR')} فعال` : ''}
    </>
  );

  return (
    <AdminPage
      title={title}
      desc={desc}
      icon={icon}
      headerVariant={headerVariant}
      action={
        <button type="button" onClick={startNew} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          افزودن
        </button>
      }
    >
      <div className="admin-content-list">
        <AdminPersistBanner />

        {status === 'saved' ? (
          <p className="admin-content-list__toast" role="status">
            تغییرات ذخیره شد.
          </p>
        ) : null}

        <div className="admin-content-list__stats">
          <StatCard
            label="کل موارد"
            value={items.length.toLocaleString('fa-IR')}
            icon={icon ?? 'Layers'}
            hint="رکورد در این مجموعه"
            tone="teal"
          />
          {activeCount !== null ? (
            <StatCard
              label="فعال"
              value={activeCount.toLocaleString('fa-IR')}
              icon="Eye"
              hint={`${(items.length - activeCount).toLocaleString('fa-IR')} غیرفعال`}
              tone="green"
            />
          ) : (
            <StatCard
              label="ستون‌های لیست"
              value={columns.length.toLocaleString('fa-IR')}
              icon="ClipboardList"
              hint="فیلد در نمای فهرست"
              tone="blue"
            />
          )}
        </div>

        <AdminContentPanel title="فهرست موارد" summary={panelSummary}>
          {items.length === 0 ? (
            <AdminListEmpty
              icon={icon ?? 'Inbox'}
              title={emptyTitle ?? 'موردی ثبت نشده'}
              description={emptyDescription ?? 'اولین مورد را اضافه کنید تا در سایت نمایش داده شود.'}
              action={
                <button type="button" onClick={startNew} className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  افزودن مورد
                </button>
              }
            />
          ) : (
            <AdminCollectionRows
              items={sortedItems}
              columns={columns}
              idKey={idKey}
              onEdit={(it) => {
                setEditing({ ...it });
                setIsNew(false);
              }}
              onRemove={remove}
            />
          )}
        </AdminContentPanel>
      </div>

      {editing ? (
        <div className="admin-collection-modal admin-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="admin-collection-modal__dialog" role="dialog" aria-modal="true">
            <div className="admin-collection-modal__head">
              <div>
                <h2 className="admin-collection-modal__title">{isNew ? 'افزودن مورد جدید' : 'ویرایش مورد'}</h2>
                <p className="admin-collection-modal__desc">{title}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="admin-collection-modal__close" aria-label="بستن">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="admin-collection-modal__fields">
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
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      value={String(editing[f.key] ?? '')}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                      className="field-input"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="admin-collection-modal__actions">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-secondary">
                انصراف
              </button>
              <button type="button" onClick={save} className="btn btn-primary">
                {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
