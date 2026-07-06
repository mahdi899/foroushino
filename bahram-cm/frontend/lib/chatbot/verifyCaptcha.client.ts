import type { CaptchaPayload } from '@/lib/captcha/types';

export async function verifyChatbotCaptchaClient(input: {
  sessionId: string;
  clientIp?: string;
  payload: CaptchaPayload;
}): Promise<{ ok: boolean; error?: 'captcha' | 'network' | 'disabled' | 'rate_limit' }> {
  try {
    const res = await fetch('/api/chatbot/verify-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        session_id: input.sessionId,
        client_ip: input.clientIp,
        captcha_token: input.payload.captcha_token,
        captcha_math_id: input.payload.captcha_id,
        captcha_math_answer: input.payload.captcha_answer,
      }),
      cache: 'no-store',
    });

    if (res.status === 422) {
      return { ok: false, error: 'captcha' };
    }

    const body = (await res.json().catch(() => ({}))) as { code?: string };

    if (res.status === 503 && body.code === 'disabled') {
      return { ok: false, error: 'disabled' };
    }

    if (res.status === 429) {
      return { ok: false, error: 'rate_limit' };
    }

    if (!res.ok) {
      return { ok: false, error: 'network' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}
