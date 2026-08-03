'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Search } from 'lucide-react';
import { fetchChatbotOperatorQueue } from './actions';
import type { ChatbotOperatorProfile, ChatbotOperatorQueueEntry } from '@/lib/chatbot/types';
import { SessionOperatorPanel } from './SessionOperatorPanel';
import { Badge, Table } from '../ui';
import { cn } from '@/lib/utils';

interface OperatorQueuePanelProps {
  operatorProfiles: ChatbotOperatorProfile[];
  onQueueChanged?: () => void;
}

export function OperatorQueuePanel({ operatorProfiles, onQueueChanged }: OperatorQueuePanelProps) {
  const [items, setItems] = useState<ChatbotOperatorQueueEntry[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<{
    sessionId: string;
    logId: number;
    visitorPhone: string | null;
    visitorName: string | null;
    ticketId: number | null;
  } | null>(null);
  const currentPageRef = useRef(1);
  const qRef = useRef(q);
  qRef.current = q;
  const loadRequestIdRef = useRef(0);
  const onQueueChangedRef = useRef(onQueueChanged);
  onQueueChangedRef.current = onQueueChanged;

  const loadQueue = useCallback(async (page?: number, search?: string, refreshBadge = false) => {
    const targetPage = page ?? currentPageRef.current;
    const targetQ = search ?? qRef.current;
    currentPageRef.current = targetPage;
    setMeta((prev) => (prev.current_page === targetPage ? prev : { ...prev, current_page: targetPage }));

    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    try {
      const res = await fetchChatbotOperatorQueue({ page: targetPage, q: targetQ });
      if (requestId !== loadRequestIdRef.current) return;

      setItems(res.data);
      setMeta(res.meta);
      currentPageRef.current = res.meta.current_page;
      setSelected((prev) => {
        if (!prev) return prev;
        const stillPending = res.data.some((item) => item.id === prev.logId);
        return stillPending ? prev : null;
      });
      if (refreshBadge) onQueueChangedRef.current?.();
    } catch {
      if (requestId !== loadRequestIdRef.current) return;
      setItems([]);
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    currentPageRef.current = 1;
    void loadQueue(1, '', true);
  }, [loadQueue]);

  useEffect(() => {
    let timerId = 0;

    const schedule = () => {
      window.clearTimeout(timerId);
      const delay = document.hidden ? 60_000 : 30_000;
      timerId = window.setTimeout(() => {
        if (!document.hidden) void loadQueue(currentPageRef.current, undefined, true);
        schedule();
      }, delay);
    };

    schedule();
    const onVisibility = () => {
      if (!document.hidden) void loadQueue(currentPageRef.current, undefined, true);
      schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadQueue]);

  function openItem(item: ChatbotOperatorQueueEntry) {
    if (selected?.logId === item.id) {
      setSelected(null);
      return;
    }
    setSelected({
      sessionId: item.session_id,
      logId: item.id,
      visitorPhone: item.visitor_phone,
      visitorName: item.visitor_name,
      ticketId: item.ticket_id,
    });
  }

  return (
    <div>
      <div className="admin-alert-warn mb-4 rounded-lg px-4 py-3 text-small">
        <p className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          پیام‌هایی که کاربر درخواست اپراتور کرده یا امتیاز پایین داده — اینجا لیست می‌شوند.
        </p>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          currentPageRef.current = 1;
          void loadQueue(1, q, true);
        }}
      >
        <input
          className="field-input flex-1"
          placeholder="جستجو در پیام، session یا IP…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary px-4 py-2 text-small">
          <Search className="h-4 w-4" />
        </button>
      </form>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-text-muted">
          <MessageSquare className="h-10 w-10 opacity-40" />
          <p className="text-small">پیامی در صف اپراتور نیست.</p>
        </div>
      ) : (
        <>
          <Table head={['زمان', 'پیام', 'کاربر', 'اپراتور', 'برچسب', 'تماس', '']}>
            {items.map((item) => {
              const isOpen = selected?.logId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr
                    className={cn(
                      'cursor-pointer transition-colors',
                      isOpen ? 'bg-warning/10' : 'hover:bg-surface-soft/40',
                    )}
                    onClick={() => openItem(item)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-caption">
                      {item.created_at ? new Date(item.created_at).toLocaleString('fa-IR') : '—'}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      {item.low_rating_followup && item.rated_question && (
                        <p className="mb-1 admin-text-caption text-red-700">
                          <span className="font-semibold">سؤال اصلی: </span>
                          {item.rated_question}
                        </p>
                      )}
                      <p className="line-clamp-2 text-small leading-relaxed">{item.content}</p>
                    </td>
                    <td className="px-4 py-3 text-caption">{item.visitor_name ?? '—'}</td>
                    <td className="px-4 py-3 text-caption">{item.requested_operator_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone="warning">در انتظار پاسخ</Badge>
                        {item.low_rating_followup && (
                          <span className="inline-block rounded-pill bg-red-100 px-2.5 py-0.5 text-caption font-medium text-red-800">
                            امتیاز پایین{item.rated_stars ? ` (${item.rated_stars}/5)` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-caption" dir="ltr">
                      {item.visitor_phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-caption font-medium text-accent hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openItem(item);
                        }}
                      >
                        {isOpen ? 'بستن' : 'پاسخ'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && selected && (
                    <tr className="bg-surface-soft/30">
                      <td colSpan={7} className="px-4 py-4">
                        <SessionOperatorPanel
                          sessionId={selected.sessionId}
                          visitorPhone={selected.visitorPhone}
                          visitorName={selected.visitorName}
                          operatorProfiles={operatorProfiles}
                          initialReplyToLogId={selected.logId}
                          initialTicketId={selected.ticketId}
                          onReplied={() => void loadQueue(currentPageRef.current, undefined, true)}
                          onConverted={() => void loadQueue(currentPageRef.current, undefined, true)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </Table>

          <div className="mt-4 flex items-center justify-between text-caption text-text-muted">
            <span>{meta.total} پیام در صف</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                className="btn btn-secondary py-1 text-caption disabled:opacity-40"
                onClick={() => void loadQueue(meta.current_page - 1)}
              >
                قبلی
              </button>
              <span>
                {meta.current_page} / {meta.last_page}
              </span>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                className="btn btn-secondary py-1 text-caption disabled:opacity-40"
                onClick={() => void loadQueue(meta.current_page + 1)}
              >
                بعدی
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
