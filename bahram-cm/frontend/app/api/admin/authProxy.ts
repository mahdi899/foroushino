import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';
import { extractValidationMessage } from '@/lib/services/api';

const API_BASES = [
  SERVER_API_URL,
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
].filter((url, index, arr) => arr.indexOf(url) === index);

function extractError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;

  const captchaMsg = extractValidationMessage(body, 'captcha');
  if (captchaMsg) return captchaMsg;

  if ('error' in body && body.error && typeof body.error === 'object') {
    const err = body.error as { message_fa?: string; code?: string };
    if (err.message_fa) return err.message_fa;
  }

  if ('message' in body && typeof (body as { message?: string }).message === 'string') {
    return (body as { message: string }).message;
  }

  return fallback;
}

export async function callAdminAuth(path: string, payload: Record<string, unknown>) {
  let lastStatus = 500;
  let lastBody: unknown = null;

  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      lastStatus = res.status;
      lastBody = await res.json().catch(() => null);

      if (res.ok) {
        return { ok: true as const, status: res.status, body: lastBody };
      }
    } catch {
      continue;
    }
  }

  return { ok: false as const, status: lastStatus, body: lastBody };
}

export { extractError };
