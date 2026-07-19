import 'server-only';

const BACKEND = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');

/** Accept env secret or panel-managed secret verified via Laravel internal API. */
export async function verifyRevalidateSecret(provided: string): Promise<boolean> {
  const trimmed = provided.trim();
  if (!trimmed) return false;

  const envSecret = process.env.REVALIDATE_SECRET?.trim();
  if (envSecret && trimmed === envSecret) return true;

  const internal = process.env.INTERNAL_API_SECRET?.trim();
  if (!internal) return false;

  try {
    const res = await fetch(`${BACKEND}/api/v1/internal/cache/verify-revalidate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Internal-Secret': internal,
      },
      body: JSON.stringify({ secret: trimmed }),
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return json.ok === true;
  } catch {
    return false;
  }
}
