import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';

function internalApiSecret(): string {
  return (
    process.env.REVALIDATE_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim() ||
    ''
  );
}

export async function POST(request: Request) {
  const secret = internalApiSecret();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ data: [] }, { status: 400 });
  }

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/poll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({ data: [] }));
    // Poll is best-effort — never surface 401 to the browser when the secret drifts.
    if (res.status === 401) {
      return Response.json({ data: [] });
    }
    return Response.json(json, { status: res.status });
  } catch {
    return Response.json({ data: [] }, { status: 503 });
  }
}
