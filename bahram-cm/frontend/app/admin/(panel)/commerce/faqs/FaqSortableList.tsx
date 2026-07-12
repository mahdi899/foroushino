'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { GripVertical, Loader2 } from 'lucide-react';
import { reorderFaqs } from '../actions';
import { Badge, EditLink } from '../../ui';
import type { AdminFaq } from '@/lib/admin/commerceTypes';

function reorderList<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function FaqSortableList({ faqs }: { faqs: AdminFaq[] }) {
  const router = useRouter();
  const [items, setItems] = useState(faqs);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(faqs);
  }, [faqs]);

  const ordered = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items],
  );

  async function persistOrder(next: AdminFaq[]) {
    const payload = next.map((faq, index) => ({ id: faq.id, sort_order: index + 1 }));
    setPending(true);
    setError('');
    const res = await reorderFaqs(payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'ذخیره ترتیب ناموفق بود.');
      setItems(faqs);
      return;
    }
    setItems(next.map((faq, index) => ({ ...faq, sort_order: index + 1 })));
    router.refresh();
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    const next = reorderList(ordered, dragIndex, targetIndex);
    setDragIndex(null);
    setOverIndex(null);
    setItems(next);
    void persistOrder(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-caption text-text-muted">
        برای تغییر ترتیب نمایش در سایت و چت‌بات، هر ردیف را بکشید و رها کنید.
        {pending ? (
          <span className="ms-2 inline-flex items-center gap-1 text-accent">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال ذخیره…
          </span>
        ) : null}
      </p>
      {error ? <p className="text-small text-error">{error}</p> : null}

      <div className="space-y-2">
        {ordered.map((faq, index) => {
          const hasAnswer = faq.answer.trim().length > 0;
          const dragging = dragIndex === index;
          const over = overIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <div
              key={faq.id}
              draggable={!pending}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(index);
              }}
              className={[
                'flex items-start gap-3 rounded-lg border bg-surface p-4 transition',
                dragging ? 'opacity-50' : '',
                over ? 'border-accent/60 ring-2 ring-accent/20' : 'border-border',
              ].join(' ')}
            >
              <button
                type="button"
                aria-label="جابه‌جایی"
                className="mt-0.5 shrink-0 cursor-grab text-text-muted active:cursor-grabbing"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium leading-snug">{faq.question}</p>
                    <p className="line-clamp-2 text-caption text-text-muted">
                      {hasAnswer ? faq.answer : 'پاسخی ثبت نشده — برای تکمیل ویرایش کنید.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge tone={faq.is_active ? 'success' : 'default'}>
                      {faq.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                    {!hasAnswer ? <Badge tone="warning">بدون پاسخ</Badge> : null}
                    {faq.category ? (
                      <span className="rounded-pill bg-surface-soft px-2 py-0.5 text-[11px] text-text-muted">
                        {faq.category}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-caption text-text-muted">
                  <span>ترتیب: {(index + 1).toLocaleString('fa-IR')}</span>
                  <EditLink href={`/admin/commerce/faqs/${faq.id}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-caption text-text-muted">
        سوال جدید اضافه کردید؟{' '}
        <Link href="/admin/commerce/faqs/new" className="text-accent hover:underline">
          فرم افزودن سوال
        </Link>
      </p>
    </div>
  );
}
