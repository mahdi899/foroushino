'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Reply, Send, User } from 'lucide-react';
import { fetchChatbotSessionThread, replyToChatbotSession } from '@/lib/chatbot/actions';
import type { ChatbotOperatorProfile, ChatbotThreadItem } from '@/lib/chatbot/types';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { cn } from '@/lib/utils';

const LAST_PROFILE_KEY = 'bahram_chatbot_last_operator_profile';

interface SessionOperatorPanelProps {
  sessionId: string;
  visitorPhone?: string | null;
  visitorName?: string | null;
  operatorProfiles: ChatbotOperatorProfile[];
  initialReplyToLogId?: number | null;
  onReplied?: () => void;
}

export function SessionOperatorPanel({
  sessionId,
  visitorPhone,
  visitorName,
  operatorProfiles,
  initialReplyToLogId,
  onReplied,
}: SessionOperatorPanelProps) {
  const [thread, setThread] = useState<ChatbotThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyToLogId, setReplyToLogId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightLogId, setHighlightLogId] = useState<number | null>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const threadItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);

  const validProfiles = useMemo(
    () => operatorProfiles.filter((p) => p.name.trim()),
    [operatorProfiles],
  );

  useEffect(() => {
    if (validProfiles.length === 0) {
      setSelectedProfileId('');
      return;
    }
    try {
      const saved = localStorage.getItem(LAST_PROFILE_KEY);
      if (saved && validProfiles.some((p) => p.id === saved)) {
        setSelectedProfileId(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    setSelectedProfileId(validProfiles[0]?.id ?? '');
  }, [validProfiles]);

  const loadThread = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchChatbotSessionThread(sessionId);
      setThread(data);
    } catch {
      setThread([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadThread(false);
    const timer = window.setInterval(() => void loadThread(true), 12000);
    return () => window.clearInterval(timer);
  }, [loadThread]);

  function scrollThreadToBottom(behavior: ScrollBehavior = 'auto') {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  function handleThreadScroll() {
    const el = threadScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  }

  useEffect(() => {
    if (loading || thread.length === 0) return;
    if (!stickToBottomRef.current) return;
    requestAnimationFrame(() => scrollThreadToBottom());
  }, [thread, loading]);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [sessionId]);

  useEffect(() => {
    if (!initialReplyToLogId) return;
    setReplyToLogId(initialReplyToLogId);
    setReplyText('');
  }, [initialReplyToLogId, sessionId]);

  useEffect(() => {
    if (!initialReplyToLogId) return;
    const target = thread.find((item) => item.id === initialReplyToLogId);
    const requestedId = target?.requested_operator_profile_id;
    if (requestedId && validProfiles.some((p) => p.id === requestedId)) {
      setSelectedProfileId(requestedId);
    }
  }, [initialReplyToLogId, thread, validProfiles]);

  function scrollToThreadMessage(logId: number) {
    const el = threadItemRefs.current.get(logId);
    if (!el) return;
    stickToBottomRef.current = false;
    setHighlightLogId(logId);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setHighlightLogId(null), 1600);
  }

  function selectReplyTarget(logId: number) {
    setReplyToLogId((current) => (current === logId ? null : logId));
    setError(null);
    requestAnimationFrame(() => replyTextareaRef.current?.focus());
  }

  function replyTargetPreview(item: ChatbotThreadItem | undefined): string | null {
    if (!item) return null;
    if (item.kind === 'visitor_message') return item.content ?? null;
    if (item.kind === 'exchange') return item.question ?? null;
    return null;
  }

  const threadById = useMemo(() => {
    const map = new Map<number, ChatbotThreadItem>();
    for (const item of thread) map.set(item.id, item);
    return map;
  }, [thread]);

  const repliedToLogIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of thread) {
      if (item.kind === 'operator_reply' && item.reply_to_log_id) {
        ids.add(item.reply_to_log_id);
      }
    }
    return ids;
  }, [thread]);

  const replyTarget = replyToLogId ? threadById.get(replyToLogId) : undefined;
  const replyTargetText = replyTargetPreview(replyTarget);

  function selectProfile(id: string) {
    setSelectedProfileId(id);
    try {
      localStorage.setItem(LAST_PROFILE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || sending) return;

    if (validProfiles.length > 0 && !selectedProfileId) {
      setError('یک پروفایل اپراتور انتخاب کنید.');
      return;
    }

    setSending(true);
    setError(null);

    let targetLogId = replyToLogId;
    if (!targetLogId) {
      const pendingMessage = [...thread]
        .reverse()
        .find((item) => item.kind === 'visitor_message' && item.pending_operator);
      if (pendingMessage) {
        targetLogId = pendingMessage.id;
      }
    }

    try {
      const res = await replyToChatbotSession({
        sessionId,
        message: text,
        replyToLogId: targetLogId ?? undefined,
        operatorProfileId: selectedProfileId || undefined,
      });

      if (!res.ok) {
        setError('ارسال پاسخ ناموفق بود.');
        return;
      }

      setReplyText('');
      setReplyToLogId(null);
      stickToBottomRef.current = true;
      await loadThread(true);
      requestAnimationFrame(() => scrollThreadToBottom('smooth'));
      onReplied?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-caption text-text-muted">Session: {sessionId}</p>
        <div className="flex flex-wrap items-center gap-3 text-caption text-text-muted">
          {visitorName && <p>نام: <span className="font-medium text-primary-dark">{visitorName}</span></p>}
          {visitorPhone && (
            <p>
              تلفن: <span dir="ltr">{visitorPhone}</span>
            </p>
          )}
        </div>
      </div>

      {loading && thread.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-caption text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری مکالمه…
        </div>
      ) : thread.length === 0 ? (
        <p className="py-4 text-caption text-text-muted">پیامی در این مکالمه ثبت نشده است.</p>
      ) : (
        <div
          ref={threadScrollRef}
          onScroll={handleThreadScroll}
          className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface p-3"
        >
          {thread.map((item) => {
            if (item.kind === 'visitor_message') {
              const isReplyTarget = replyToLogId === item.id;
              const wasReplied = repliedToLogIds.has(item.id);
              return (
                <div
                  key={`v-${item.id}`}
                  ref={(el) => {
                    if (el) threadItemRefs.current.set(item.id, el);
                  }}
                  className={cn(
                    'rounded-lg border p-3 text-small transition',
                    highlightLogId === item.id && 'ring-2 ring-accent/35',
                    isReplyTarget
                      ? 'border-accent bg-accent-soft/20 ring-2 ring-accent/25'
                      : item.pending_operator
                        ? 'border-warning/40 bg-warning/10'
                        : wasReplied
                          ? 'border-success/40 bg-success/10'
                          : 'border-border bg-surface-soft/40',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="admin-text-caption font-semibold text-primary">کاربر</span>
                    <div className="flex items-center gap-1.5">
                      {item.low_rating_followup && (
                        <span className="rounded-pill bg-error/15 px-2 py-0.5 admin-text-caption font-medium text-error">
                          امتیاز پایین{item.rated_stars ? ` (${item.rated_stars}/5)` : ''}
                        </span>
                      )}
                      {item.requested_operator_name && (
                        <span className="rounded-pill bg-primary/10 px-2 py-0.5 admin-text-caption font-medium text-primary">
                          درخواست: {item.requested_operator_name}
                        </span>
                      )}
                      {item.pending_operator && (
                        <span className="rounded-pill bg-warning/15 px-2 py-0.5 admin-text-caption font-medium text-warning">
                          در انتظار پاسخ
                        </span>
                      )}
                      {wasReplied && !item.pending_operator && (
                        <span className="rounded-pill bg-success/15 px-2 py-0.5 admin-text-caption font-medium text-success">
                          پاسخ داده شد
                        </span>
                      )}
                      {isReplyTarget && (
                        <span className="rounded-pill bg-accent/15 px-2 py-0.5 admin-text-caption font-medium text-accent">
                          در حال پاسخ
                        </span>
                      )}
                    </div>
                  </div>
                  {item.low_rating_followup && item.rated_question && (
                    <p className="mb-2 rounded-md bg-error/10 px-2 py-1.5 admin-text-caption leading-relaxed text-text-muted">
                      <span className="font-semibold text-error">سؤال اصلی: </span>
                      {item.rated_question}
                    </p>
                  )}
                  <p className="leading-relaxed">{item.content}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="admin-text-caption text-text-muted">
                      {item.created_at ? new Date(item.created_at).toLocaleString('fa-IR') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => selectReplyTarget(item.id)}
                      className={cn(
                        'inline-flex items-center gap-1 admin-text-caption font-medium hover:underline',
                        isReplyTarget ? 'text-primary-dark' : 'text-accent',
                      )}
                    >
                      <Reply className="h-3 w-3" />
                      {isReplyTarget ? 'لغو پاسخ' : 'پاسخ'}
                    </button>
                  </div>
                </div>
              );
            }

            if (item.kind === 'operator_reply') {
              const repliedTo = item.reply_to_log_id
                ? threadById.get(item.reply_to_log_id)
                : undefined;
              const repliedToText = replyTargetPreview(repliedTo);

              return (
                <div key={`o-${item.id}`} className="rounded-lg border border-accent/20 bg-accent-soft/20 p-3 text-small">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-surface-soft ring-1 ring-accent/20">
                      {item.operator_avatar_url ? (
                        <DirectMediaImg
                          admin
                          src={item.operator_avatar_url}
                          alt={item.operator_name ?? 'اپراتور'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-accent">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="admin-text-caption font-semibold text-accent">
                      {item.operator_name ?? 'اپراتور'}
                    </p>
                  </div>
                  {repliedToText && item.reply_to_log_id && (
                    <button
                      type="button"
                      onClick={() => scrollToThreadMessage(item.reply_to_log_id!)}
                      className="mb-2 flex w-full items-start gap-1.5 rounded-md border border-accent/20 bg-surface-soft px-2 py-1.5 text-right transition hover:border-accent/35 hover:bg-surface-soft/80"
                    >
                      <Reply className="mt-0.5 h-3 w-3 shrink-0 scale-x-[-1] text-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block admin-text-caption font-semibold text-accent">در پاسخ به</span>
                        <span className="mt-0.5 line-clamp-2 admin-text-caption leading-relaxed text-text-muted">
                          {repliedToText}
                        </span>
                      </span>
                    </button>
                  )}
                  <p className="leading-relaxed">{item.content}</p>
                  <p className="mt-1 admin-text-caption text-text-muted">
                    {item.created_at ? new Date(item.created_at).toLocaleString('fa-IR') : ''}
                  </p>
                </div>
              );
            }

            const isReplyTarget = replyToLogId === item.id;
            const wasReplied = repliedToLogIds.has(item.id);

            return (
              <div
                key={`e-${item.id}`}
                ref={(el) => {
                  if (el) threadItemRefs.current.set(item.id, el);
                }}
                className={cn(
                  'rounded-lg border p-3 text-small transition',
                  highlightLogId === item.id && 'ring-2 ring-accent/35',
                  isReplyTarget
                    ? 'border-accent bg-accent-soft/20 ring-2 ring-accent/25'
                    : wasReplied
                      ? 'border-success/40 bg-success/10'
                      : 'border-border bg-surface',
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="admin-text-caption font-semibold text-primary">گفتگوی AI</span>
                  <div className="flex items-center gap-1.5">
                    {wasReplied && (
                      <span className="rounded-pill bg-success/15 px-2 py-0.5 admin-text-caption font-medium text-success">
                        پاسخ داده شد
                      </span>
                    )}
                    {isReplyTarget && (
                      <span className="rounded-pill bg-accent/15 px-2 py-0.5 admin-text-caption font-medium text-accent">
                        در حال پاسخ
                      </span>
                    )}
                  </div>
                </div>
                <p className="admin-text-caption text-text-muted">
                  {item.created_at ? new Date(item.created_at).toLocaleString('fa-IR') : ''}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-primary">کاربر:</span> {item.question}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-accent">بات:</span> {item.answer}
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => selectReplyTarget(item.id)}
                    className={cn(
                      'inline-flex items-center gap-1 admin-text-caption font-medium hover:underline',
                      isReplyTarget ? 'text-primary-dark' : 'text-accent',
                    )}
                  >
                    <Reply className="h-3 w-3" />
                    {isReplyTarget ? 'لغو پاسخ' : 'پاسخ به کاربر'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={(e) => void handleSend(e)} className="rounded-lg border border-border bg-surface-soft/30 p-3">
        {replyToLogId && (
          <div className="mb-2 rounded-md border border-accent/20 bg-accent-soft/15 px-3 py-2">
            <p className="flex items-center gap-1 admin-text-caption font-medium text-accent">
              <Reply className="h-3 w-3 shrink-0" />
              در حال پاسخ به پیام #{replyToLogId}
              <button
                type="button"
                className="ms-auto text-text-muted hover:underline"
                onClick={() => setReplyToLogId(null)}
              >
                لغو
              </button>
            </p>
            {replyTargetText && (
              <button
                type="button"
                onClick={() => scrollToThreadMessage(replyToLogId)}
                className="mt-1 flex w-full items-start gap-1.5 text-right transition hover:opacity-80"
              >
                <Reply className="mt-0.5 h-3 w-3 shrink-0 scale-x-[-1] text-accent" />
                <span className="line-clamp-2 admin-text-caption leading-relaxed text-text-muted">
                  {replyTargetText}
                </span>
              </button>
            )}
          </div>
        )}

        {validProfiles.length > 0 ? (
          <div className="mb-3">
            <p className="mb-2 admin-text-meta font-medium text-text-muted">پاسخ به نام:</p>
            <div className="flex flex-wrap gap-2">
              {validProfiles.map((profile) => {
                const active = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => selectProfile(profile.id)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 admin-text-meta font-medium transition',
                      active
                        ? 'border-accent bg-accent-soft/40 text-accent shadow-sm'
                        : 'border-border bg-surface text-text-muted hover:border-accent/30 hover:text-primary',
                    )}
                  >
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-soft ring-1 ring-border/60">
                      {profile.avatar_url ? (
                        <DirectMediaImg
                          admin
                          src={profile.avatar_url}
                          alt={profile.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center">
                          <User className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    {profile.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mb-3 rounded-md border border-dashed border-warning/30 bg-warning/10 px-3 py-2 admin-text-meta text-text">
            ابتدا در تب تنظیمات، پروفایل اپراتور بسازید تا نام و عکس برای کاربر نمایش داده شود.
          </p>
        )}

        <textarea
          ref={replyTextareaRef}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          placeholder="پاسخ اپراتور به کاربر…"
          className="field-input min-h-[72px] resize-y text-small leading-relaxed"
          disabled={sending}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {error && <p className="admin-text-caption text-error">{error}</p>}
          <button
            type="submit"
            disabled={sending || !replyText.trim() || (validProfiles.length > 0 && !selectedProfileId)}
            className="btn btn-primary ms-auto inline-flex items-center gap-1.5 px-4 py-2 text-caption"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            ارسال پاسخ
          </button>
        </div>
      </form>
    </div>
  );
}
