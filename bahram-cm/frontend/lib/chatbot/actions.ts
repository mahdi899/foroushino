'use server';

import { headers } from 'next/headers';
import { aiChatCompletionWithRuntime } from '@/lib/ai/client';
import { getResolvedChatbotAiRuntime } from '@/lib/ai/settings';
import { buildSiteContextForAi } from '@/lib/ai/siteContext';
import { SERVER_API_URL } from '@/lib/api/config';
import { adminFetch } from '@/lib/auth/session';
import { resolveClientIpOrUnknown, isLoopbackIp } from '@/lib/request/clientIp';
import { buildChatbotSystemPrompt, CHATBOT_UNAVAILABLE_REPLY, defaultCtas, parseChatbotAiResponse, unavailableFallbackCtas } from './prompt';
import { getServerChatbotConfig } from './public';
import type { ChatbotCta, ChatbotLogsResponse, ChatbotExportRow, ChatbotOperatorQueueResponse, ChatbotSendResult, ChatbotSessionsResponse, ChatbotThreadItem } from './types';

function revalidateSecret(): string {
  return process.env.REVALIDATE_SECRET?.trim() || '';
}

async function clientMeta(clientIpOverride?: string): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const fromHeaders = resolveClientIpOrUnknown((name) => h.get(name));
  const override = clientIpOverride?.trim();
  const ip =
    override && !isLoopbackIp(override)
      ? override
      : !isLoopbackIp(fromHeaders)
        ? fromHeaders
        : override || fromHeaders;
  return {
    ip,
    userAgent: h.get('user-agent')?.trim() || '',
  };
}

async function persistChatbotLog(input: {
  sessionId: string;
  question: string;
  answer: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}): Promise<number | null> {
  const secret = revalidateSecret();

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        question: input.question,
        answer: input.answer,
        client_ip: input.ip,
        user_agent: input.userAgent,
        metadata: input.metadata,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { id?: number } };
    return typeof body.data?.id === 'number' ? body.data.id : null;
  } catch {
    return null;
  }
}

export async function sendChatbotMessage(input: {
  sessionId: string;
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  clientIp?: string;
  captchaToken?: string;
  captchaMathId?: string;
  captchaMathAnswer?: string;
  honeypot?: string;
}): Promise<ChatbotSendResult> {
  const config = await getServerChatbotConfig();
  if (!config.enabled) {
    return {
      ok: false,
      error: 'disabled',
      fallbackReply: CHATBOT_UNAVAILABLE_REPLY,
      fallbackCtas: unavailableFallbackCtas(config),
    };
  }

  const runtime = await getResolvedChatbotAiRuntime();
  const unavailableFallback = {
    fallbackReply: CHATBOT_UNAVAILABLE_REPLY,
    fallbackCtas: unavailableFallbackCtas(config),
  };

  if (!runtime.enabled || !runtime.active.apiKey) {
    return { ok: false, error: 'ai_disabled', ...unavailableFallback };
  }

  const question = input.message.trim();
  if (!question || question.length > 2000) {
    return { ok: false, error: 'network', ...unavailableFallback };
  }

  const { ip, userAgent } = await clientMeta(input.clientIp);
  const secret = revalidateSecret();

  try {
    const gateRes = await fetch(`${SERVER_API_URL}/chatbot/gate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        message: question,
        client_ip: ip,
        user_agent: userAgent,
        honeypot: input.honeypot ?? '',
        captcha_token: input.captchaToken,
        captcha_math_id: input.captchaMathId,
        captcha_math_answer: input.captchaMathAnswer,
      }),
      cache: 'no-store',
    });

    if (gateRes.status === 429) {
      const body = (await gateRes.json().catch(() => ({}))) as {
        retry_after?: number;
        reason?: string;
      };
      await persistChatbotLog({
        sessionId: input.sessionId,
        question,
        answer: '[خطا] محدودیت تعداد پیام',
        ip,
        userAgent,
        metadata: { error: true, code: 'rate_limit', reason: body.reason },
      });
      return {
        ok: false,
        error: 'rate_limit',
        retryAfter: body.retry_after ?? 60,
        rateReason: body.reason,
      };
    }

    if (gateRes.status === 422) {
      const body = (await gateRes.json().catch(() => ({}))) as { code?: string };
      const code = body.code === 'bot' ? 'bot' : 'captcha';
      await persistChatbotLog({
        sessionId: input.sessionId,
        question,
        answer: code === 'bot' ? '[خطا] درخواست نامعتبر' : '[خطا] تأیید امنیتی نامعتبر',
        ip,
        userAgent,
        metadata: { error: true, code },
      });
      return { ok: false, error: code };
    }

    if (!gateRes.ok) {
      await persistChatbotLog({
        sessionId: input.sessionId,
        question,
        answer: '[خطا] اتصال به سرور',
        ip,
        userAgent,
        metadata: { error: true, code: 'network', status: gateRes.status },
      });
      return { ok: false, error: 'network', ...unavailableFallback };
    }
  } catch {
    return { ok: false, error: 'network', ...unavailableFallback };
  }

  const context = await buildSiteContextForAi();
  const systemPrompt = buildChatbotSystemPrompt(context, config);
  const historySlice = input.history.slice(-config.max_history_messages);

  let aiText = '';
  try {
    const completion = await aiChatCompletionWithRuntime(runtime, {
      messages: [
        { role: 'system', content: systemPrompt },
        ...historySlice.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: question },
      ],
      temperature: runtime.active.temperature,
      responseFormat: 'json',
    });
    if (!completion.ok || !completion.content?.trim()) {
      const summary =
        !completion.ok && 'detail' in completion
          ? completion.detail?.summary ?? completion.error
          : 'پاسخی از AI دریافت نشد';
      const hints =
        !completion.ok && 'detail' in completion ? completion.detail?.hints ?? [] : [];

      const logId = await persistChatbotLog({
        sessionId: input.sessionId,
        question,
        answer: `[خطا] ${summary}`,
        ip,
        userAgent,
        metadata: {
          error: true,
          code: 'ai_error',
          reason: !completion.ok && 'reason' in completion ? completion.reason : undefined,
          model: runtime.active.model,
          hints,
        },
      });

      return {
        ok: false,
        error: 'ai_error',
        errorMessage: hints.length > 0 ? `${summary} — ${hints[0]}` : summary,
        logId: logId ?? undefined,
        ...unavailableFallback,
      };
    }
    aiText = completion.content.trim();
  } catch (err) {
    const summary = err instanceof Error ? err.message : 'خطای ناشناخته AI';
    const logId = await persistChatbotLog({
      sessionId: input.sessionId,
      question,
      answer: `[خطا] ${summary}`,
      ip,
      userAgent,
      metadata: { error: true, code: 'ai_error', model: runtime.active.model },
    });
    return {
      ok: false,
      error: 'ai_error',
      errorMessage: summary,
      logId: logId ?? undefined,
      ...unavailableFallback,
    };
  }

  const parsed = parseChatbotAiResponse(aiText);
  let ctas: ChatbotCta[] = parsed.ctas;

  if (ctas.length === 0) {
    ctas = defaultCtas(config);
  }

  ctas = ctas.filter((c) => {
    if (c.type === 'consultation') return config.cta_consultation;
    if (c.type === 'pricing') return config.cta_pricing;
    if (c.type === 'whatsapp') return config.cta_whatsapp;
    if (c.type === 'phone') return config.cta_phone;
    return true;
  });

  const logId = await persistChatbotLog({
    sessionId: input.sessionId,
    question,
    answer: parsed.reply,
    ip,
    userAgent,
    metadata: { ctas, model: runtime.active.model },
  });

  return { ok: true, reply: parsed.reply, ctas, logId: logId ?? undefined };
}

export async function rateChatbotMessage(input: {
  sessionId: string;
  logId: number;
  rating: number;
}): Promise<{ ok: boolean; lowRating?: boolean }> {
  const secret = revalidateSecret();

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        log_id: input.logId,
        rating: input.rating,
      }),
      cache: 'no-store',
    });

    if (!res.ok) return { ok: false };

    const body = (await res.json()) as { data?: { low_rating?: boolean } };
    return { ok: true, lowRating: body.data?.low_rating === true };
  } catch {
    return { ok: false };
  }
}

export async function submitChatbotRatingFeedback(input: {
  sessionId: string;
  logId: number;
  feedback: string;
  clientIp?: string;
}): Promise<{ ok: boolean; queuedLogId?: number; error?: 'invalid' | 'duplicate' | 'network' }> {
  const secret = revalidateSecret();
  const { ip, userAgent } = await clientMeta(input.clientIp);
  const feedback = input.feedback.trim().slice(0, 2000);
  if (feedback.length < 2) {
    return { ok: false, error: 'invalid' };
  }

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/rating-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        log_id: input.logId,
        feedback,
        client_ip: ip,
        user_agent: userAgent,
      }),
      cache: 'no-store',
    });

    if (res.status === 422) {
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      return { ok: false, error: body.code === 'duplicate' ? 'duplicate' : 'invalid' };
    }

    if (!res.ok) {
      return { ok: false, error: 'network' };
    }

    const body = (await res.json()) as { data?: { log_id?: number } };
    return { ok: true, queuedLogId: body.data?.log_id };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function verifyChatbotCaptcha(input: {
  sessionId: string;
  clientIp?: string;
  captchaToken?: string;
  captchaMathId?: string;
  captchaMathAnswer?: string;
}): Promise<{ ok: boolean; error?: 'captcha' | 'network' | 'disabled' }> {
  const config = await getServerChatbotConfig();
  if (!config.enabled) {
    return { ok: false, error: 'disabled' };
  }

  const { ip } = await clientMeta(input.clientIp);
  const secret = revalidateSecret();

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/verify-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        client_ip: ip,
        captcha_token: input.captchaToken,
        captcha_math_id: input.captchaMathId,
        captcha_math_answer: input.captchaMathAnswer,
      }),
      cache: 'no-store',
    });

    if (res.status === 422) {
      return { ok: false, error: 'captcha' };
    }

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'network' };
    }

    if (!res.ok) {
      return { ok: false, error: 'network' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function logChatbotSessionOpen(input: {
  sessionId: string;
  pageUrl?: string;
}): Promise<void> {
  const secret = revalidateSecret();
  const { ip, userAgent } = await clientMeta();

  try {
    await fetch(`${SERVER_API_URL}/chatbot/session-open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        client_ip: ip,
        user_agent: userAgent,
        page_url: input.pageUrl,
      }),
      cache: 'no-store',
    });
  } catch {
    /* non-fatal */
  }
}

export async function saveChatbotPhone(input: {
  sessionId: string;
  phone: string;
  pageUrl?: string;
  clientIp?: string;
}): Promise<{ ok: boolean; error?: 'invalid' | 'network' }> {
  const secret = revalidateSecret();
  const { ip, userAgent } = await clientMeta(input.clientIp);
  const phone = input.phone.replace(/\D/g, '').slice(0, 11);

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        phone,
        client_ip: ip,
        user_agent: userAgent,
        page_url: input.pageUrl?.startsWith('/') ? input.pageUrl.slice(0, 500) : undefined,
      }),
      cache: 'no-store',
    });

    if (res.status === 422) {
      return { ok: false, error: 'invalid' };
    }

    if (!res.ok) {
      return { ok: false, error: 'network' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function saveChatbotVisitorInfo(input: {
  sessionId: string;
  visitorFirstName?: string;
  visitorLastName?: string;
  preferredOperatorProfileId?: string | null;
  clientIp?: string;
}): Promise<{ ok: boolean }> {
  const secret = revalidateSecret();
  const { ip, userAgent } = await clientMeta(input.clientIp);

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/visitor-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        visitor_first_name: input.visitorFirstName ?? '',
        visitor_last_name: input.visitorLastName ?? '',
        preferred_operator_profile_id: input.preferredOperatorProfileId ?? '',
        client_ip: ip,
        user_agent: userAgent,
      }),
      cache: 'no-store',
    });

    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function queueChatbotVisitorMessage(input: {
  sessionId: string;
  message: string;
  clientIp?: string;
  requestedOperatorProfileId?: string;
  captchaToken?: string;
  captchaMathId?: string;
  captchaMathAnswer?: string;
  honeypot?: string;
}): Promise<{ ok: boolean; logId?: number; error?: 'captcha' | 'bot' | 'network' | 'disabled' | 'rate_limit'; retryAfter?: number; rateReason?: string }> {
  const config = await getServerChatbotConfig();
  if (!config.enabled) {
    return { ok: false, error: 'disabled' };
  }

  const question = input.message.trim();
  if (!question || question.length > 2000) {
    return { ok: false, error: 'network' };
  }

  const { ip, userAgent } = await clientMeta(input.clientIp);
  const secret = revalidateSecret();

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/visitor-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        message: question,
        client_ip: ip,
        user_agent: userAgent,
        requested_operator_profile_id: input.requestedOperatorProfileId || undefined,
        honeypot: input.honeypot ?? '',
        captcha_token: input.captchaToken,
        captcha_math_id: input.captchaMathId,
        captcha_math_answer: input.captchaMathAnswer,
      }),
      cache: 'no-store',
    });

    if (res.status === 422) {
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      return { ok: false, error: body.code === 'bot' ? 'bot' : 'captcha' };
    }

    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { retry_after?: number; reason?: string };
      return {
        ok: false,
        error: 'rate_limit',
        retryAfter: body.retry_after ?? 60,
        rateReason: body.reason,
      };
    }

    if (!res.ok) {
      return { ok: false, error: 'network' };
    }

    const body = (await res.json()) as { data?: { id?: number } };
    return { ok: true, logId: body.data?.id };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function pollChatbotUpdates(input: {
  sessionId: string;
  afterLogId: number;
}): Promise<ChatbotThreadItem[]> {
  const secret = revalidateSecret();

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/poll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({
        session_id: input.sessionId,
        after_log_id: input.afterLogId,
      }),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const body = (await res.json()) as { data?: ChatbotThreadItem[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchChatbotSessionThread(sessionId: string): Promise<ChatbotThreadItem[]> {
  const res = await adminFetch<{ data: ChatbotThreadItem[] }>(
    `/panel/chatbot/sessions/${sessionId}/thread`,
  );
  return res.data;
}

export async function replyToChatbotSession(input: {
  sessionId: string;
  message: string;
  replyToLogId?: number;
  operatorProfileId?: string;
}): Promise<{ ok: boolean }> {
  try {
    await adminFetch<{ data: { id: number } }>(
      `/panel/chatbot/sessions/${input.sessionId}/reply`,
      {
        method: 'POST',
        body: {
          message: input.message.trim(),
          ...(input.replyToLogId ? { reply_to_log_id: input.replyToLogId } : {}),
          ...(input.operatorProfileId ? { operator_profile_id: input.operatorProfileId } : {}),
        },
      },
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function fetchChatbotLogs(query: {
  page?: number;
  q?: string;
}): Promise<ChatbotLogsResponse> {
  return adminFetch<ChatbotLogsResponse>('/panel/chatbot/logs', {
    query: {
      page: query.page ?? 1,
      per_page: 20,
      q: query.q?.trim() || undefined,
    },
  });
}

export async function fetchChatbotSessions(query: {
  page?: number;
  q?: string;
}): Promise<ChatbotSessionsResponse> {
  return adminFetch<ChatbotSessionsResponse>('/panel/chatbot/sessions', {
    query: {
      page: query.page ?? 1,
      per_page: 20,
      q: query.q?.trim() || undefined,
    },
  });
}

export async function fetchChatbotOperatorQueue(query: {
  page?: number;
  q?: string;
  per_page?: number;
}): Promise<ChatbotOperatorQueueResponse> {
  return adminFetch<ChatbotOperatorQueueResponse>('/panel/chatbot/operator-queue', {
    query: {
      page: query.page ?? 1,
      per_page: query.per_page ?? 20,
      q: query.q?.trim() || undefined,
    },
  });
}

export async function fetchChatbotOperatorQueueCount(): Promise<number> {
  const res = await fetchChatbotOperatorQueue({ page: 1, per_page: 1 });
  return res.meta.total;
}

export async function exportChatbotLogs(q?: string): Promise<ChatbotExportRow[]> {
  const res = await adminFetch<{ data: ChatbotExportRow[] }>('/panel/chatbot/export', {
    query: { q: q?.trim() || undefined },
  });
  return res.data;
}

export async function deleteChatbotSessions(sessionIds: string[]): Promise<number> {
  const res = await adminFetch<{ data: { deleted: number } }>('/panel/chatbot/sessions', {
    method: 'DELETE',
    body: { session_ids: sessionIds },
  });
  return res.data.deleted;
}
