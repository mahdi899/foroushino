'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Mic, RefreshCw, Square, Video } from 'lucide-react';
import { fetchVideoPromptAction } from '@/lib/student/identityActions';

const MIN_SEC = 5;
const MAX_SEC = 20;

const TIPS = [
  'ویدیو باید زنده از دوربین ضبط شود؛ آپلود فایل مجاز نیست.',
  `مدت ضبط بین ${MIN_SEC.toLocaleString('fa-IR')} تا ${MAX_SEC.toLocaleString('fa-IR')} ثانیه باشد.`,
  'متن نمایش‌داده‌شده را با صدای واضح و رو به دوربین بخوانید.',
] as const;

type Props = {
  onRecorded: (blob: Blob) => void;
  onPrompt: (text: string) => void;
  hasRecording: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function LiveSelfieVideoStep({ onRecorded, onPrompt, hasRecording, onBack, onContinue }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
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
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      stopStream();
    };
  }, [clearTimers, stopStream]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setError('دسترسی به دوربین ممکن نشد. لطفاً مجوز دوربین و میکروفون را در مرورگر فعال کنید.');
    }
  }

  function finishRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    clearTimers();
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

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

    try {
      const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        if (secs < MIN_SEC) {
          setError(`ویدیو خیلی کوتاه است. حداقل ${MIN_SEC.toLocaleString('fa-IR')} ثانیه ضبط کنید.`);
          void startCamera();
          return;
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onRecorded(blob);
        stopStream();
        setCameraReady(false);
      };
      recorder.start(200);
      startedAtRef.current = Date.now();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      maxTimerRef.current = setTimeout(() => finishRecording(), MAX_SEC * 1000);
    } catch {
      setError('ضبط ویدیو در این مرورگر پشتیبانی نمی‌شود.');
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
                playsInline
                className="panel-identity-selfie-video__live"
              />
              {!cameraReady ? (
                <div className="panel-identity-selfie-video__placeholder">
                  <Camera size={28} strokeWidth={1.75} aria-hidden />
                  <p>دوربین هنوز روشن نشده است</p>
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
              <video src={previewUrl} controls className="panel-identity-selfie-video__playback" />
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
                disabled={!prompt || loadingPrompt}
              >
                <Camera size={16} aria-hidden />
                روشن کردن دوربین
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
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          قبلی
        </button>
        <button type="button" className="btn btn-primary" disabled={!hasRecording} onClick={onContinue}>
          ادامه
        </button>
      </div>
    </div>
  );
}
