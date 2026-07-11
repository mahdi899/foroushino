'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Camera, CheckCircle2, Loader2, Mic, RefreshCw, Square, Video } from 'lucide-react';
import { fetchVideoPromptAction } from '@/lib/student/identityActions';
import {
  MediaPermissionError,
  mediaPermissionErrorMessage,
  requestCameraAndMicrophone,
  stopMediaStream,
} from '@/lib/media/requestUserMedia';
import {
  createMediaRecorder,
  createRecorderBlob,
  isLiveMediaStream,
  primeVideoElement,
  recorderErrorMessage,
  startMediaRecorder,
} from '@/lib/media/recorder';

const MIN_SEC = 5;
const MAX_SEC = 20;

const TIPS = [
  'ویدیو باید زنده از دوربین ضبط شود؛ آپلود فایل مجاز نیست.',
  `مدت ضبط بین ${MIN_SEC.toLocaleString('fa-IR')} تا ${MAX_SEC.toLocaleString('fa-IR')} ثانیه باشد.`,
  'متن نمایش‌داده‌شده را با صدای واضح و رو به دوربین بخوانید.',
] as const;

async function waitForVideoElement(
  ref: RefObject<HTMLVideoElement | null>,
  timeoutMs = 3000,
): Promise<HTMLVideoElement> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (ref.current) return ref.current;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  throw new Error('Video element not ready');
}

async function bindStreamToVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  await Promise.race([
    new Promise<void>((resolve) => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }
      const done = () => resolve();
      video.addEventListener('loadedmetadata', done, { once: true });
      video.addEventListener('loadeddata', done, { once: true });
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1500);
    }),
  ]);

  try {
    await video.play();
  } catch (firstErr) {
    if (!video.paused) return;
    try {
      await video.play();
    } catch {
      throw firstErr;
    }
  }
}

function isMediaAccessError(err: unknown): boolean {
  if (err instanceof MediaPermissionError) return true;
  if (!(err instanceof DOMException)) return false;
  return ['NotAllowedError', 'PermissionDeniedError', 'NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError'].includes(
    err.name,
  );
}

function cameraAttachErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'MediaStream inactive') {
    return 'اتصال دوربین قطع شده است. دوباره «اجازه دسترسی» را بزنید.';
  }

  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') {
    return 'مرورگر اجازهٔ پخش تصویر دوربین را نداد. دوباره «اجازه دسترسی» را بزنید.';
  }

  if (err instanceof Error && err.message === 'Video element not ready') {
    return 'نمایش دوربین آماده نشد. صفحه را رفرش کنید و دوباره تلاش کنید.';
  }

  return 'اتصال به دوربین برقرار نشد. دوباره «اجازه دسترسی» را بزنید.';
}

type Props = {
  onRecorded: (blob: Blob) => void;
  onPrompt: (text: string) => void;
  hasRecording: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function LiveSelfieVideoStep({
  onRecorded,
  onPrompt,
  hasRecording,
  onBack,
  onContinue,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const onPromptRef = useRef(onPrompt);

  useEffect(() => {
    onPromptRef.current = onPrompt;
  }, [onPrompt]);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    tickRef.current = null;
    maxTimerRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    if (!isLiveMediaStream(stream)) {
      throw new Error('MediaStream inactive');
    }

    if (streamRef.current !== stream) {
      stopMediaStream(streamRef.current);
      streamRef.current = stream;
    }

    const video = await waitForVideoElement(videoRef);
    await bindStreamToVideo(video, stream);
    setCameraReady(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      window.setTimeout(() => {
        if (!mountedRef.current) {
          stopMediaStream(streamRef.current);
          streamRef.current = null;
        }
      }, 0);
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl || !playbackRef.current) return;
    const video = playbackRef.current;
    video.src = previewUrl;
    return primeVideoElement(video);
  }, [previewUrl]);

  const loadPrompt = useCallback(async () => {
    setLoadingPrompt(true);
    setError(null);
    const res = await fetchVideoPromptAction();
    setLoadingPrompt(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPrompt(res.text);
    onPromptRef.current(res.text);
  }, []);

  useEffect(() => {
    void loadPrompt();
  }, [loadPrompt]);

  async function startCamera() {
    setError(null);
    setRequestingCamera(true);
    try {
      stopStream();
      const stream = await requestCameraAndMicrophone();
      await attachStream(stream);
    } catch (err) {
      setError(isMediaAccessError(err) ? mediaPermissionErrorMessage(err) : cameraAttachErrorMessage(err));
    } finally {
      setRequestingCamera(false);
    }
  }

  function handleBack() {
    stopStream();
    onBack();
  }

  function finishRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    clearTimers();
    if (recorder.state === 'recording') {
      recorder.requestData();
    }
    recorder.stop();
    setRecording(false);
  }

  function startRecording() {
    if (!streamRef.current || !prompt) return;
    setError(null);
    chunksRef.current = [];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      const recorder = createMediaRecorder(streamRef.current);
      const mimeType = recorder.mimeType;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const blob = createRecorderBlob(chunksRef.current, recorder.mimeType || mimeType);
        if (blob.size === 0) {
          setError('ضبط ویدیو انجام نشد. دوباره «شروع ضبط» را بزنید.');
          setCameraReady(Boolean(streamRef.current && isLiveMediaStream(streamRef.current)));
          return;
        }
        if (secs < MIN_SEC) {
          setError(`ویدیو خیلی کوتاه است. حداقل ${MIN_SEC.toLocaleString('fa-IR')} ثانیه ضبط کنید.`);
          setCameraReady(Boolean(streamRef.current && isLiveMediaStream(streamRef.current)));
          return;
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onRecorded(blob);
        stopStream();
      };
      startMediaRecorder(recorder);
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      maxTimerRef.current = setTimeout(() => finishRecording(), MAX_SEC * 1000);
    } catch (err) {
      setError(recorderErrorMessage(err));
    }
  }

  async function retake() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    await startCamera();
  }

  return (
    <div className="panel-identity-selfie-video">
      <div className="panel-identity-selfie-video__header">
        <span className="panel-identity-selfie-video__icon" aria-hidden>
          <Video size={20} strokeWidth={2} />
        </span>
        <div>
          <h3 className="panel-identity-selfie-video__title">ضبط ویدیوی سلفی زنده</h3>
          <p className="panel-identity-selfie-video__lead">
            برای تأیید هویت، یک ویدیوی کوتاه از خودتان ضبط کنید و جملهٔ نمایش‌داده‌شده را بخوانید.
          </p>
        </div>
      </div>

      <div className="panel-identity-selfie-video__body">
        <aside className="panel-identity-selfie-video__aside">
          <div className="panel-identity-selfie-video__prompt">
            <p className="panel-identity-selfie-video__prompt-label">
              <Mic size={14} aria-hidden />
              متنی که باید با صدای بلند بخوانید
            </p>
            {prompt ? (
              <p className="panel-identity-selfie-video__prompt-text">{prompt}</p>
            ) : (
              <button
                type="button"
                className="btn btn-secondary panel-identity-selfie-video__prompt-btn"
                disabled={loadingPrompt}
                onClick={() => void loadPrompt()}
              >
                {loadingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                دریافت متن ویدیو
              </button>
            )}
          </div>

          <ul className="panel-identity-selfie-video__tips">
            {TIPS.map((tip) => (
              <li key={tip}>
                <CheckCircle2 size={14} aria-hidden />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="panel-identity-selfie-video__stage">
          {!previewUrl ? (
            <div className="panel-identity-selfie-video__viewport">
              <video
                ref={videoRef}
                muted
                autoPlay
                playsInline
                className="panel-identity-selfie-video__live"
              />
              {!cameraReady ? (
                <div className="panel-identity-selfie-video__placeholder">
                  <Camera size={28} strokeWidth={1.75} aria-hidden />
                  <p>برای ضبط ویدیو، دسترسی دوربین و میکروفون لازم است</p>
                  <p className="panel-identity-selfie-video__placeholder-hint">
                    با زدن دکمهٔ زیر، مرورگر از شما اجازه می‌خواهد.
                  </p>
                </div>
              ) : null}
              {recording ? (
                <span className="panel-identity-selfie-video__recording-badge">
                  <span className="panel-identity-selfie-video__recording-dot" aria-hidden />
                  در حال ضبط — {elapsed.toLocaleString('fa-IR')} ثانیه
                </span>
              ) : null}
            </div>
          ) : (
            <div className="panel-identity-selfie-video__viewport panel-identity-selfie-video__viewport--recorded">
              <video
                ref={playbackRef}
                controls
                playsInline
                preload="auto"
                className="panel-identity-selfie-video__playback"
              />
              <span className="panel-identity-selfie-video__recorded-badge">
                <CheckCircle2 size={14} aria-hidden />
                ضبط شد
              </span>
            </div>
          )}

          {error ? <p className="panel-identity-selfie-video__error">{error}</p> : null}

          <div className="panel-identity-selfie-video__controls">
            {!cameraReady && !previewUrl ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void startCamera()}
                disabled={!prompt || loadingPrompt || requestingCamera}
              >
                {requestingCamera ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera size={16} aria-hidden />}
                {requestingCamera ? 'در انتظار تأیید دسترسی…' : 'اجازه دسترسی به دوربین و میکروفون'}
              </button>
            ) : null}
            {cameraReady && !recording ? (
              <button type="button" className="btn btn-primary" onClick={startRecording}>
                <Video size={16} aria-hidden />
                شروع ضبط
              </button>
            ) : null}
            {recording ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={finishRecording}
                disabled={elapsed < MIN_SEC}
              >
                <Square size={16} aria-hidden />
                توقف ({elapsed.toLocaleString('fa-IR')}ث)
              </button>
            ) : null}
            {previewUrl ? (
              <button type="button" className="btn btn-secondary" onClick={() => void retake()}>
                <RefreshCw size={16} aria-hidden />
                ضبط مجدد
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="panel-identity-step__actions">
        <button type="button" className="btn btn-secondary" onClick={handleBack}>
          قبلی
        </button>
        <button type="button" className="btn btn-primary" disabled={!hasRecording} onClick={onContinue}>
          ادامه
        </button>
      </div>
    </div>
  );
}
