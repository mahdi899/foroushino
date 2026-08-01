/** Admin-facing errors when streaming identity verification artifacts fails. */
export function identityArtifactStreamErrorMessage(status?: number): string {
  if (status === 401) {
    return 'نشست شما منقضی شده. دوباره وارد پنل ادمین شوید.';
  }
  if (status === 403) {
    return 'اجازه مشاهده این مدرک را ندارید.';
  }
  if (status === 404) {
    return 'فایل مدرک روی سرور موجود نیست.';
  }
  return 'نمایش مدرک ناموفق بود. صفحه را رفرش کنید یا دوباره تلاش کنید.';
}

export async function probeIdentityArtifactStream(src: string): Promise<{ ok: true } | { ok: false; status?: number }> {
  try {
    const res = await fetch(src, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Range: 'bytes=0-0' },
    });
    if (res.ok || res.status === 206) {
      return { ok: true };
    }
    return { ok: false, status: res.status };
  } catch {
    return { ok: false };
  }
}
