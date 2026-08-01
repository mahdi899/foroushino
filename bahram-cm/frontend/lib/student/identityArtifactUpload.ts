import { resolveIdentityApiErrorDetail } from '@/lib/student/identityVerificationErrors';

export type IdentityArtifactUploadResult = {
  artifactId: number;
};

/**
 * Client-side upload — streams to Next API route → Laravel without Server Action overhead.
 */
export async function uploadIdentityArtifactClient(formData: FormData): Promise<IdentityArtifactUploadResult> {
  const res = await fetch('/api/student/identity-verification/artifacts', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
    cache: 'no-store',
  });

  const payload = (await res.json().catch(() => undefined)) as
    | { data?: { id?: number }; error?: { message_fa?: string; code?: string }; message?: string }
    | undefined;

  if (!res.ok) {
    const detail = resolveIdentityApiErrorDetail(
      { status: res.status, payload } as Error & { status: number; payload?: unknown },
      'بارگذاری مدرک ناموفق بود.',
    );
    throw new Error(detail.message);
  }

  const artifactId = payload?.data?.id;
  if (typeof artifactId !== 'number') {
    throw new Error('پاسخ سرور ناقص بود. دوباره تلاش کنید.');
  }

  return { artifactId };
}
