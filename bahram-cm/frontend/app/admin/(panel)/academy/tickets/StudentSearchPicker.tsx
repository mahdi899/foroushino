'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, User, X } from 'lucide-react';
import { searchStudentsForPicker } from '../actions';
import type { AdminStudent } from '@/lib/admin/academyTypes';

export type SelectedStudent = {
  id: number;
  display_name: string;
  mobile: string | null;
};

function studentDisplayName(student: AdminStudent): string {
  return student.display_name?.trim() || student.name || 'دانشجو';
}

function studentSubline(student: AdminStudent): string | null {
  const family = [student.first_name, student.last_name].filter(Boolean).join(' ');
  if (family && family !== studentDisplayName(student)) return family;
  if (student.name && student.name !== studentDisplayName(student)) return student.name;
  return null;
}

interface StudentSearchPickerProps {
  value: SelectedStudent | null;
  onChange: (student: SelectedStudent | null) => void;
  required?: boolean;
}

export function StudentSearchPicker({ value, onChange, required }: StudentSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadPage = useCallback(async (targetPage: number, search: string, replace: boolean) => {
    setLoading(true);
    setError('');
    const res = await searchStudentsForPicker({ search: search || undefined, page: targetPage });
    setLoading(false);

    if (!res.ok) {
      setError(res.error);
      if (replace) setItems([]);
      return;
    }

    setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
    setPage(res.meta?.current_page ?? targetPage);
    setLastPage(res.meta?.last_page ?? 1);
    setTotal(res.meta?.total ?? res.items.length);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPage(1);
    void loadPage(1, debouncedQuery, true);
  }, [open, debouncedQuery, loadPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    setQuery('');
    setDebouncedQuery('');
    return undefined;
  }, [open]);

  function selectStudent(student: AdminStudent) {
    onChange({
      id: student.id,
      display_name: studentDisplayName(student),
      mobile: student.mobile,
    });
    setOpen(false);
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div className="min-w-0">
      <span className="field-label">
        دانشجو
        {required ? <span className="text-error"> *</span> : null}
      </span>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="field-input mt-1 flex w-full cursor-pointer items-center justify-between gap-2 text-start"
      >
        {value ? (
          <span className="min-w-0 truncate">
            <span className="font-medium text-primary-dark">{value.display_name}</span>
            {value.mobile ? (
              <span className="ms-2 text-caption text-text-muted" dir="ltr">
                {value.mobile}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-text-muted">انتخاب دانشجو...</span>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {value ? (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded p-0.5 text-text-muted hover:bg-surface-soft hover:text-error"
              aria-label="حذف انتخاب"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <Search className="h-4 w-4 text-text-muted" />
        </span>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="admin-overlay absolute inset-0"
            aria-hidden
          />
          <div
            className="relative flex max-h-[min(85vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-premium"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-picker-title"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p id="student-picker-title" className="text-small font-semibold text-primary-dark">
                انتخاب دانشجو
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-text-muted hover:bg-surface-soft"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-border px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="field-input w-full ps-9"
                  placeholder="جستجو نام، نام‌خانوادگی، موبایل..."
                />
              </div>
              <p className="mt-2 text-caption text-text-muted">
                {total > 0 ? `${total.toLocaleString('fa-IR')} دانشجو` : 'حداکثر ۲۰ نفر در هر صفحه'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {error && <p className="mb-2 px-2 text-small text-error">{error}</p>}

              {loading && items.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : items.length === 0 ? (
                <p className="py-10 text-center text-small text-text-muted">دانشجویی یافت نشد.</p>
              ) : (
                <ul className="space-y-1">
                  {items.map((student) => {
                    const selected = value?.id === student.id;
                    const sub = studentSubline(student);
                    return (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => selectStudent(student)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition hover:bg-surface-soft ${
                            selected ? 'bg-accent-soft ring-1 ring-accent/30' : ''
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-soft text-text-muted">
                            {student.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-small font-medium text-primary-dark">
                              {studentDisplayName(student)}
                            </span>
                            {sub ? (
                              <span className="mt-0.5 block truncate text-caption text-text-muted">{sub}</span>
                            ) : null}
                            <span className="mt-0.5 block truncate text-caption text-text-muted" dir="ltr">
                              {student.mobile ?? '—'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => void loadPage(page - 1, debouncedQuery, true)}
                className="btn btn-secondary text-caption"
              >
                <ChevronRight className="h-4 w-4" />
                قبلی
              </button>
              <span className="text-caption text-text-muted">
                صفحه {page.toLocaleString('fa-IR')} از {lastPage.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                disabled={loading || page >= lastPage}
                onClick={() => void loadPage(page + 1, debouncedQuery, true)}
                className="btn btn-secondary text-caption"
              >
                بعدی
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
