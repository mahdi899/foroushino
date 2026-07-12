'use client';

import { useEffect, useState } from 'react';
import { Loader2, Table as TableIcon, Trash2, X } from 'lucide-react';

export type TableManageAction =
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteRow'
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteColumn'
  | 'deleteTable';

interface TableEditorModalProps {
  open: boolean;
  mode: 'insert' | 'manage';
  onClose: () => void;
  onInsert: (opts: { rows: number; cols: number; withHeaderRow: boolean }) => void;
  onManage: (action: TableManageAction) => void;
}

function ActionButton({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? 'rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-caption font-semibold text-danger transition hover:bg-danger/10'
          : 'rounded-lg border border-border bg-surface-soft px-3 py-2 text-caption font-semibold text-text transition hover:border-primary/30 hover:text-primary'
      }
    >
      {label}
    </button>
  );
}

export function TableEditorModal({ open, mode, onClose, onInsert, onManage }: TableEditorModalProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(3);
    setCols(3);
    setWithHeaderRow(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mode, onClose]);

  if (!open) return null;

  function clampRows(n: number) {
    return Math.min(20, Math.max(2, n));
  }

  function clampCols(n: number) {
    return Math.min(10, Math.max(2, n));
  }

  function handleInsert(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    onInsert({ rows: clampRows(rows), cols: clampCols(cols), withHeaderRow });
    setSubmitting(false);
    onClose();
  }

  function runManage(action: TableManageAction) {
    onManage(action);
    if (action === 'deleteTable') onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={onClose} />
      {mode === 'insert' ? (
        <form
          onSubmit={handleInsert}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-floating"
        >
          <ModalHeader title="درج جدول" desc="تعداد ردیف و ستون را مشخص کنید" onClose={onClose} />
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">تعداد ردیف</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(clampRows(Number(e.target.value) || 2))}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">تعداد ستون</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={cols}
                  onChange={(e) => setCols(clampCols(Number(e.target.value) || 2))}
                  className="field-input"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-small text-text">
              <input
                type="checkbox"
                checked={withHeaderRow}
                onChange={(e) => setWithHeaderRow(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              سطر اول به‌عنوان عنوان (header)
            </label>
          </div>
          <ModalFooter onClose={onClose} submitLabel="درج جدول" submitting={submitting} />
        </form>
      ) : (
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
          <ModalHeader title="مدیریت جدول" desc="ردیف و ستون اضافه/حذف کنید یا کل جدول را پاک کنید" onClose={onClose} />
          <div className="space-y-4 px-5 py-4">
            <div>
              <p className="field-label mb-2">ردیف‌ها</p>
              <div className="flex flex-wrap gap-2">
                <ActionButton label="+ ردیف بالا" onClick={() => runManage('addRowBefore')} />
                <ActionButton label="+ ردیف پایین" onClick={() => runManage('addRowAfter')} />
                <ActionButton label="حذف ردیف فعلی" onClick={() => runManage('deleteRow')} danger />
              </div>
            </div>
            <div>
              <p className="field-label mb-2">ستون‌ها</p>
              <div className="flex flex-wrap gap-2">
                <ActionButton label="+ ستون چپ" onClick={() => runManage('addColumnBefore')} />
                <ActionButton label="+ ستون راست" onClick={() => runManage('addColumnAfter')} />
                <ActionButton label="حذف ستون فعلی" onClick={() => runManage('deleteColumn')} danger />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => runManage('deleteTable')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/5 px-4 py-2.5 text-small font-semibold text-danger transition hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
                حذف کل جدول
              </button>
            </div>
          </div>
          <div className="border-t border-border px-5 py-3">
            <button type="button" onClick={onClose} className="btn btn-secondary w-full px-4 py-2 text-small">
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalHeader({ title, desc, onClose }: { title: string; desc: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <p className="flex items-center gap-2 font-semibold text-primary-dark">
          <TableIcon className="h-4 w-4" />
          {title}
        </p>
        <p className="mt-0.5 text-caption text-text-muted">{desc}</p>
      </div>
      <button type="button" onClick={onClose} className="admin-icon-btn">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function ModalFooter({
  onClose,
  submitLabel,
  submitting,
}: {
  onClose: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  return (
    <div className="flex gap-2 border-t border-border px-5 py-3">
      <button type="button" onClick={onClose} className="btn btn-secondary flex-1 px-4 py-2 text-small">
        انصراف
      </button>
      <button type="submit" disabled={submitting} className="btn btn-primary flex-1 px-4 py-2 text-small">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
      </button>
    </div>
  );
}
