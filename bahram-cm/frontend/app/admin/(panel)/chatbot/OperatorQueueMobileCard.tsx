'use client';

import { ChevronDown, Phone, Reply, User } from 'lucide-react';
import { Badge } from '../ui';
import { cn } from '@/lib/utils';
import type { ChatbotOperatorProfile, ChatbotOperatorQueueEntry } from '@/lib/chatbot/types';
import { SessionOperatorPanel } from './SessionOperatorPanel';

function formatQueueTime(createdAt: string | null): string {
  if (!createdAt) return '—';
  return new Date(createdAt).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface OperatorQueueMobileCardProps {
  item: ChatbotOperatorQueueEntry;
  isOpen: boolean;
  onToggle: () => void;
  operatorProfiles: ChatbotOperatorProfile[];
  onReplied: () => void;
  onConverted: () => void;
}

export function OperatorQueueMobileCard({
  item,
  isOpen,
  onToggle,
  operatorProfiles,
  onReplied,
  onConverted,
}: OperatorQueueMobileCardProps) {
  return (
    <article
      className={cn(
        'admin-queue-card card overflow-hidden border-s-[3px] transition-colors',
        isOpen ? 'border-s-warning bg-warning/5' : 'border-s-warning/50 hover:border-s-warning/80',
      )}
    >
      <button type="button" className="w-full text-start" onClick={onToggle}>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Badge tone="warning">در انتظار پاسخ</Badge>
              {item.low_rating_followup ? (
                <span className="inline-block rounded-pill bg-red-100 px-2.5 py-0.5 text-caption font-medium text-red-800">
                  امتیاز پایین{item.rated_stars ? ` (${item.rated_stars}/5)` : ''}
                </span>
              ) : null}
              {item.ticket_id != null ? <Badge tone="success">تیکت #{item.ticket_id}</Badge> : null}
            </div>
            <time className="shrink-0 text-caption text-text-muted">{formatQueueTime(item.created_at)}</time>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption">
            <span className="inline-flex items-center gap-1 font-medium text-primary-dark">
              <User className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
              {item.visitor_name ?? 'مهمان'}
            </span>
            {item.visitor_phone ? (
              <a
                href={`tel:${item.visitor_phone}`}
                className="inline-flex items-center gap-1 font-mono text-accent hover:underline"
                dir="ltr"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {item.visitor_phone}
              </a>
            ) : null}
            {item.requested_operator_name ? (
              <span className="text-text-muted">اپراتور: {item.requested_operator_name}</span>
            ) : null}
          </div>

          <div className="rounded-xl bg-surface-soft/70 px-3.5 py-3">
            {item.low_rating_followup && item.rated_question ? (
              <p className="mb-2.5 border-b border-border/50 pb-2.5 text-caption leading-relaxed text-red-700">
                <span className="font-semibold">سؤال اصلی: </span>
                {item.rated_question}
              </p>
            ) : null}
            <p className={cn('text-small leading-relaxed text-text', !isOpen && 'line-clamp-4')}>
              {item.content}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-accent">
              <Reply className="h-4 w-4 shrink-0" aria-hidden />
              {isOpen ? 'بستن پنل پاسخ' : 'پاسخ به پیام'}
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-text-muted transition-transform', isOpen && 'rotate-180')}
              aria-hidden
            />
          </div>
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-border bg-surface-soft/30 p-3">
          <SessionOperatorPanel
            sessionId={item.session_id}
            visitorPhone={item.visitor_phone}
            visitorName={item.visitor_name}
            operatorProfiles={operatorProfiles}
            initialReplyToLogId={item.id}
            initialTicketId={item.ticket_id}
            onReplied={onReplied}
            onConverted={onConverted}
          />
        </div>
      ) : null}
    </article>
  );
}
