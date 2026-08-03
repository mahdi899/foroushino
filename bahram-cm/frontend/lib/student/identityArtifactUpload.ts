import { resolveIdentityApiErrorDetail } from '@/lib/student/identityVerificationErrors';
import { createUploadProgressReporter } from '@/lib/student/uploadProgressReporter';

export type IdentityArtifactUploadResult = {
  artifactId: number;
};

export type IdentityArtifactUploadOptions = {
  onProgress?: (percent: number) => void;
};

type UploadPayload = {
  data?: { id?: number };
  error?: { message_fa?: string; code?: string };
  message?: string;
};

function parseUploadPayload(raw: string): UploadPayload | undefined {
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as UploadPayload;
  } catch {
    return undefined;
  }
}

function resolveUploadFailure(status: number, payload: UploadPayload | undefined): Error {
  const detail = resolveIdentityApiErrorDetail(
    { status, payload } as Error & { status: number; payload?: unknown },
    'بارگذاری مدرک ناموفق بود.',
  );
  return new Error(detail.message);
}

/**
 * Client-side upload — streams to Next API route → Laravel without Server Action overhead.
 * Uses XHR so upload progress can be reported to the UI.
 */
export function uploadIdentityArtifactClient(
  formData: FormData,
  options?: IdentityArtifactUploadOptions,
): Promise<IdentityArtifactUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/student/identity-verification/artifacts');
    xhr.withCredentials = true;
    xhr.responseType = 'text';

    const reportProgress = options?.onProgress
      ? createUploadProgressReporter(options.onProgress)
      : undefined;

    xhr.upload.onprogress = (event) => {
      if (!reportProgress || !event.lengthComputable || event.total <= 0) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      reportProgress(percent);
    };

    xhr.onload = () => {
      const payload = parseUploadPayload(xhr.responseText);

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(resolveUploadFailure(xhr.status, payload));
        return;
      }

      const artifactId = payload?.data?.id;
      if (typeof artifactId !== 'number') {
        reject(new Error('پاسخ سرور ناقص بود. دوباره تلاش کنید.'));
        return;
      }

      reportProgress?.(100);
      resolve({ artifactId });
    };

    xhr.onerror = () => {
      reject(new Error('بارگذاری مدرک ناموفق بود. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.'));
    };

    xhr.onabort = () => {
      reject(new Error('بارگذاری لغو شد.'));
    };

    xhr.send(formData);
  });
}
