import 'server-only';

import { randomUUID } from 'crypto';
import { SERVER_API_URL } from '@/lib/api/config';
import type { MathCaptchaChallenge } from './types';

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] ?? d).replace(/-/g, '−');
}

export function buildMathChallenge(): MathCaptchaChallenge & { answer: number } {
  let a = Math.floor(Math.random() * 15) + 1;
  let b = Math.floor(Math.random() * 15) + 1;
  const subtract = Math.random() < 0.5;

  if (subtract && b > a) {
    [a, b] = [b, a];
  }

  const answer = subtract ? a - b : a + b;
  const operator = subtract ? '−' : '+';

  return {
    id: randomUUID(),
    question: toPersianDigits(`${a} ${operator} ${b}`),
    answer,
  };
}

export async function registerMathChallenge(id: string, answer: number): Promise<boolean> {
  const secret = process.env.REVALIDATE_SECRET?.trim() || '';

  try {
    const res = await fetch(`${SERVER_API_URL}/captcha/math/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify({ id, answer }),
      cache: 'no-store',
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function createFallbackMathChallenge(): Promise<MathCaptchaChallenge | null> {
  const challenge = buildMathChallenge();
  const stored = await registerMathChallenge(challenge.id, challenge.answer);
  if (!stored) return null;

  return { id: challenge.id, question: challenge.question };
}
