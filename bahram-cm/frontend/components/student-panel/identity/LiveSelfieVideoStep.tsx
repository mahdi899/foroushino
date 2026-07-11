'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Square, Video } from 'lucide-react';
import { fetchVideoPromptAction } from '@/lib/student/identityActions';

const MIN_SEC = 5;
const MAX_SEC = 20;

type Props = {
  onRecorded: (blob: Blob) => void;
  onPrompt: (text: string) => void;
};

export function LiveSelfieVideoStep({ onRecorded, onPrompt }: Props) {
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearTimers, stopStream, previewUrl]);

  async function loadPrompt() {
    setLoadingPrompt(true);
    setError(null);
    const res = await fetchVideoPromptAction();
    setLoadingPrompt(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPrompt(res.text);
    onPrompt(res.text);
  }

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
      setError('دسترسی به دوربین ممکن نشد. لطفاً مجوز دوربین را در مرورگر فعال کنید.');
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
          setError('ویدیو خیلی کوتاه است. حداقل ۵ ثانیه ضبط کنید.');
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#008c96]/25 bg-[#008c96]/5 p-4">
        <p className="mb-2 text-sm font-bold text-text">متنی که باید با صدای بلند بخوانید:</p>
        {prompt ? (
          <p className="text-base leading-relaxed text-text">{prompt}</p>
        ) : (
          <button type="button" className="btn btn-secondary" disabled={loadingPrompt} onClick={() => void loadPrompt()}>
            {loadingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            دریافت متن ویدیو
          </button>
        )}
      </div>

      <p className="text-sm text-text-muted">
        ویدیو باید زنده از دوربین ضبط شود (۵ تا ۲۰ ثانیه). آپلود فایل مجاز نیست.
      </p>

      {!previewUrl ? (
        <div className="aspect-[3/4] max-h-[420px] overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
        </div>
      ) : (
        <video src={previewUrl} controls className="max-h-[420px] w-full rounded-xl bg-black" />
      )}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {!cameraReady && !previewUrl ? (
          <button type="button" className="btn btn-primary" onClick={() => void startCamera()} disabled={!prompt}>
            <Camera size={16} />
            روشن کردن دوربین
          </button>
        ) : null}
        {cameraReady && !recording ? (
          <button type="button" className="btn btn-primary" onClick={startRecording}>
            <Video size={16} />
            شروع ضبط
          </button>
        ) : null}
        {recording ? (
          <button type="button" className="btn btn-secondary" onClick={finishRecording} disabled={elapsed < MIN_SEC}>
            <Square size={16} />
            توقف ({elapsed.toLocaleString('fa-IR')}ث)
          </button>
        ) : null}
        {previewUrl ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPreviewUrl(null);
              void startCamera();
            }}
          >
            ضبط مجدد
          </button>
        ) : null}
      </div>
    </div>
  );
}
