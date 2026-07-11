const RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
] as const;

export function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

export function getRecorderMimeType(): string {
  if (!isMediaRecorderSupported()) return '';
  return RECORDER_MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? '';
}

function recorderMimeAttempts(): Array<string | undefined> {
  if (!isMediaRecorderSupported()) return [];

  const supported = RECORDER_MIME_CANDIDATES.filter((mime) => MediaRecorder.isTypeSupported(mime));
  const attempts: Array<string | undefined> = [...supported];

  if (!attempts.includes(undefined)) {
    attempts.push(undefined);
  }

  return attempts;
}

export function isLiveMediaStream(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream.getTracks().some((track) => track.readyState === 'live');
}

/** Pick the first MediaRecorder config that works with this stream. */
export function createMediaRecorder(stream: MediaStream): MediaRecorder {
  if (!isMediaRecorderSupported()) {
    throw new Error('MediaRecorder unsupported');
  }

  if (!isLiveMediaStream(stream)) {
    throw new Error('MediaStream inactive');
  }

  let lastError: unknown;
  for (const mimeType of recorderMimeAttempts()) {
    try {
      return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('MediaRecorder init failed');
}

export function startMediaRecorder(recorder: MediaRecorder, timesliceMs = 250): void {
  try {
    recorder.start(timesliceMs);
  } catch {
    recorder.start();
  }
}

export function recorderErrorMessage(err: unknown): string {
  if (!isMediaRecorderSupported()) {
    return 'ضبط ویدیو در این مرورگر پشتیبانی نمی‌شود. از Chrome، Firefox، Edge یا Safari نسخهٔ جدید استفاده کنید.';
  }

  if (err instanceof Error && err.message === 'MediaStream inactive') {
    return 'اتصال دوربین قطع شده است. دوباره «اجازه دسترسی به دوربین و میکروفون» را بزنید.';
  }

  return 'ضبط ویدیو در این مرورگر انجام نشد. مرورگر را به‌روز کنید یا Chrome / Safari جدید را امتحان کنید.';
}

export function createRecorderBlob(chunks: Blob[], mimeType: string): Blob {
  const chunkType = chunks.find((chunk) => chunk.size > 0)?.type;
  return new Blob(chunks, { type: chunkType || mimeType || 'video/webm' });
}

export function selfieVideoFileName(blob: Blob): string {
  const type = (blob.type || '').toLowerCase();
  if (type.includes('mp4')) return 'selfie.mp4';
  if (type.includes('quicktime')) return 'selfie.mov';
  return 'selfie.webm';
}

export function primeVideoElement(video: HTMLVideoElement) {
  const seekToFirstFrame = () => {
    if (video.readyState < 2) return;
    const target = Math.min(0.05, Math.max(video.duration - 0.001, 0));
    if (!Number.isFinite(target)) return;
    try {
      video.currentTime = target;
    } catch {
      /* ignore seek errors on short clips */
    }
  };

  video.addEventListener('loadeddata', seekToFirstFrame);
  video.addEventListener('loadedmetadata', seekToFirstFrame);
  video.load();

  return () => {
    video.removeEventListener('loadeddata', seekToFirstFrame);
    video.removeEventListener('loadedmetadata', seekToFirstFrame);
  };
}
