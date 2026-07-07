import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

type RevalidateBody = {
  secret?: string;
  tags?: string[];
  paths?: string[];
};

function resolveSecret(request: NextRequest, body: RevalidateBody): string {
  const header = request.headers.get('x-revalidate-secret')?.trim();
  if (header) return header;
  return body.secret?.trim() ?? '';
}

function secretMatches(provided: string): boolean {
  const expected = process.env.REVALIDATE_SECRET?.trim();
  if (!expected || !provided) return false;
  return provided === expected;
}

/** ISR purge webhook — called by Laravel CacheService after admin purge / content changes. */
export async function POST(request: NextRequest) {
  let body: RevalidateBody = {};
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const provided = resolveSecret(request, body);
  if (!secretMatches(provided)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && t.length > 0) : [];
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === 'string' && p.startsWith('/')) : [];

  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidated: { tags, paths },
    at: new Date().toISOString(),
  });
}
