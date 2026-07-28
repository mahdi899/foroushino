import {
  createMediaRecorder,
  createRecorderBlob,
  isMediaRecorderSupported,
  SELFIE_VIDEO_MAX_BYTES,
  startMediaRecorder,
} from '@/lib/media/recorder';

/** Soft target — keep uploads well under nginx / Server Action limits. */
export const SELFIE_VIDEO_TARGET_BYTES = 6 * 1024 * 1024;

export const SELFIE_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: {
    facingMode: 'user',
    width: { ideal: 720, max: 1280 },
    height: { ideal: 720, max: 1280 },
    frameRate: { ideal: 24, max: 30 },
  },
};

type OptimizePass = {
  maxEdge: number;
  fps: number;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
};

const OPTIMIZE_PASSES: OptimizePass[] = [
  { maxEdge: 720, fps: 15, videoBitsPerSecond: 700_000, audioBitsPerSecond: 64_000 },
  { maxEdge: 540, fps: 12, videoBitsPerSecond: 450_000, audioBitsPerSecond: 48_000 },
  { maxEdge: 480, fps: 10, videoBitsPerSecond: 300_000, audioBitsPerSecond: 48_000 },
];

export function scaleToMaxEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const longest = Math.max(w, h);
  if (longest <= maxEdge) {
    return { width: w, height: h };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(2, Math.round(w * scale) & ~1),
    height: Math.max(2, Math.round(h * scale) & ~1),
  };
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('video metadata failed'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function videoCaptureStream(video: HTMLVideoElement): MediaStream | null {
  const withCapture = video as HTMLVideoElement & {
    captureStream?: (frameRate?: number) => MediaStream;
    mozCaptureStream?: (frameRate?: number) => MediaStream;
  };
  try {
    if (typeof withCapture.captureStream === 'function') {
      return withCapture.captureStream();
    }
    if (typeof withCapture.mozCaptureStream === 'function') {
      return withCapture.mozCaptureStream();
    }
  } catch {
    return null;
  }
  return null;
}

async function reencodeSelfiePass(source: Blob, pass: OptimizePass): Promise<Blob | null> {
  if (typeof document === 'undefined' || !isMediaRecorderSupported()) {
    return null;
  }
  if (typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
    return null;
  }

  const objectUrl = URL.createObjectURL(source);
  const video = document.createElement('video');
  video.playsInline = true;
  // Unmuted so AudioContext can tap speech audio; volume 0 avoids speaker playback.
  video.muted = false;
  video.volume = 0;
  video.preload = 'auto';
  video.src = objectUrl;

  let audioCtx: AudioContext | null = null;

  try {
    await waitForVideoMetadata(video);
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return null;
    }

    const { width, height } = scaleToMaxEdge(
      video.videoWidth || 720,
      video.videoHeight || 720,
      pass.maxEdge,
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    const canvasStream = canvas.captureStream(pass.fps);
    const videoTrack = canvasStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const tracks: MediaStreamTrack[] = [videoTrack];

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        const elementSource = audioCtx.createMediaElementSource(video);
        const destination = audioCtx.createMediaStreamDestination();
        elementSource.connect(destination);
        // Keep playback silent during optimize; audio still flows to the destination stream.
        tracks.push(...destination.stream.getAudioTracks());
      }
    } catch {
      const sourceStream = videoCaptureStream(video);
      sourceStream?.getAudioTracks().forEach((track) => tracks.push(track.clone()));
      sourceStream?.getVideoTracks().forEach((track) => track.stop());
    }

    const mixed = new MediaStream(tracks);

    video.currentTime = 0;
    await video.play().catch(() => undefined);

    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = createMediaRecorder(mixed, {
        videoBitsPerSecond: pass.videoBitsPerSecond,
        audioBitsPerSecond: pass.audioBitsPerSecond,
      });
    } catch {
      mixed.getTracks().forEach((track) => track.stop());
      return null;
    }

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error('recorder failed'));
      recorder.onstop = () => {
        resolve(createRecorderBlob(chunks, recorder.mimeType || 'video/webm'));
      };
    });

    let raf = 0;
    const draw = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, width, height);
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    startMediaRecorder(recorder);

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      video.addEventListener('ended', done, { once: true });
      window.setTimeout(done, Math.ceil(video.duration * 1000) + 1500);
    });

    if (recorder.state !== 'inactive') {
      try {
        recorder.requestData();
      } catch {
        /* ignore */
      }
      recorder.stop();
    }

    cancelAnimationFrame(raf);
    video.pause();
    mixed.getTracks().forEach((track) => track.stop());

    const result = await recorded;
    if (!result.size) return null;
    return result;
  } catch {
    return null;
  } finally {
    void audioCtx?.close().catch(() => undefined);
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Shrink a selfie recording before upload.
 * Returns the original blob when already small enough or when re-encode is unsupported.
 */
export async function optimizeSelfieVideo(
  blob: Blob,
  options?: { targetBytes?: number; maxBytes?: number },
): Promise<Blob> {
  const targetBytes = options?.targetBytes ?? SELFIE_VIDEO_TARGET_BYTES;
  const maxBytes = options?.maxBytes ?? SELFIE_VIDEO_MAX_BYTES;

  if (blob.size <= targetBytes) {
    return blob;
  }

  let best = blob;

  for (const pass of OPTIMIZE_PASSES) {
    const next = await reencodeSelfiePass(best, pass);
    if (!next || next.size === 0) {
      continue;
    }
    if (next.size < best.size) {
      best = next;
    }
    if (best.size <= targetBytes) {
      break;
    }
  }

  if (best.size > maxBytes && best === blob) {
    return blob;
  }

  return best.size <= blob.size ? best : blob;
}
