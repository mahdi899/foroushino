import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim() || '';
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
    return Response.json(json, { status: res.status });
  } catch {
    return Response.json({ data: [] }, { status: 503 });
  }
}
