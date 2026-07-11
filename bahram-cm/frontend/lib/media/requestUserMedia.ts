export type MediaPermissionErrorCode =
  | 'insecure_context'
  | 'unsupported'
  | 'denied'
  | 'not_found'
  | 'in_use'
  | 'unknown';

export class MediaPermissionError extends Error {
  code: MediaPermissionErrorCode;

  constructor(message: string, code: MediaPermissionErrorCode) {
    super(message);
    this.name = 'MediaPermissionError';
    this.code = code;
  }
}

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: 'user' },
  audio: true,
};

function mapGetUserMediaError(err: unknown): MediaPermissionError {
  const name = err instanceof DOMException ? err.name : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return new MediaPermissionError(
      'دسترسی به دوربین و میکروفون رد شد. در پنجرهٔ مرورگر «اجازه دادن» را انتخاب کنید؛ اگر قبلاً رد کرده‌اید، از تنظیمات سایت در مرورگر مجوزها را فعال کنید.',
      'denied',
    );
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new MediaPermissionError('دوربین یا میکروفون در این دستگاه پیدا نشد.', 'not_found');
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return new MediaPermissionError(
      'دوربین یا میکروفون در حال استفاده توسط برنامهٔ دیگری است. آن را ببندید و دوباره تلاش کنید.',
      'in_use',
    );
  }

  return new MediaPermissionError(
    'دسترسی به دوربین و میکروفون ممکن نشد. لطفاً مجوزها را در مرورگر فعال کنید.',
    'unknown',
  );
}

export function mediaPermissionErrorMessage(err: unknown): string {
  if (err instanceof MediaPermissionError) return err.message;
  return mapGetUserMediaError(err).message;
}

/** Requests camera + microphone; must run inside a user gesture when possible. */
export async function requestCameraAndMicrophone(
  constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS,
): Promise<MediaStream> {
  if (typeof window === 'undefined') {
    throw new MediaPermissionError('دسترسی به رسانه فقط در مرورگر امکان‌پذیر است.', 'unsupported');
  }

  if (!window.isSecureContext) {
    throw new MediaPermissionError(
      'برای دسترسی به دوربین و میکروفون باید از HTTPS یا localhost استفاده کنید. در شبکهٔ محلی، آدرس https:// یا localhost را امتحان کنید.',
      'insecure_context',
    );
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MediaPermissionError(
      'مرورگر شما از دسترسی به دوربین و میکروفون پشتیبانی نمی‌کند.',
      'unsupported',
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    const hasFacingMode =
      typeof constraints.video === 'object' &&
      constraints.video !== null &&
      'facingMode' in constraints.video;

    if (hasFacingMode) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: constraints.audio ?? true });
      } catch (fallbackErr) {
        throw mapGetUserMediaError(fallbackErr);
      }
    }

    throw mapGetUserMediaError(err);
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
