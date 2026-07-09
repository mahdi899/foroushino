'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { FieldDef } from './AdminCollection';
import { Badge } from './ui';

function renderMetaValue(it: Record<string, unknown>, c: FieldDef) {
  if (c.badge) {
    return <Badge tone="accent">{String(it[c.key] ?? '—')}</Badge>;
  }
  if (c.type === 'boolean') {
    return it[c.key] ? <Badge tone="success">فعال</Badge> : <Badge>غیرفعال</Badge>;
  }
  return <span className="admin-collection-row__meta-value">{String(it[c.key] ?? '—')}</span>;
}

export function AdminCollectionRows({
  items,
  columns,
  idKey,
  onEdit,
  onRemove,
}: {
  items: Record<string, unknown>[];
  columns: FieldDef[];
  idKey: string;
  onEdit: (item: Record<string, unknown>) => void;
  onRemove: (id: unknown) => void;
}) {
  const titleCol = columns[0];
  const orderCol = columns.find((c) => c.key === 'order');
  const metaCols = columns.filter((c) => c !== titleCol && c !== orderCol);

  return (
    <ul className="admin-collection-rows">
      {items.map((it, i) => {
        const rowId = it[idKey] ?? i;
        const title = String(it[titleCol?.key ?? idKey] ?? '—');
        const order = orderCol ? it[orderCol.key] : null;

        return (
          <li key={String(rowId)}>
            <article className="admin-collection-row">
              <div className="admin-collection-row__main">
                {orderCol ? (
                  <span className="admin-collection-row__order">{String(order ?? '—')}</span>
                ) : (
                  <span className="admin-collection-row__order admin-collection-row__order--muted">
                    {(i + 1).toLocaleString('fa-IR')}
                  </span>
                )}
                <div className="admin-collection-row__content min-w-0">
                  <h3 className="admin-collection-row__title">{title}</h3>
                  {metaCols.length > 0 ? (
                    <div className="admin-collection-row__meta">
                      {metaCols.map((c) => (
                        <div key={c.key} className="admin-collection-row__meta-item">
                          <span className="admin-collection-row__meta-label">{c.label}</span>
                          {renderMetaValue(it, c)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="admin-collection-row__actions">
                <button
                  type="button"
                  onClick={() => onEdit(it)}
                  className="admin-collection-row__btn admin-collection-row__btn--edit"
                  title="ویرایش"
                >
                  <Pencil className="h-4 w-4" strokeWidth={2} />
                  <span>ویرایش</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(it[idKey])}
                  className="admin-collection-row__btn admin-collection-row__btn--delete"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                  <span className="admin-collection-row__btn-label">حذف</span>
                </button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
