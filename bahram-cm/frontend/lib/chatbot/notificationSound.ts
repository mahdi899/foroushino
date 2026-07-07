/**
 * Chatbot notification tones — synthesized in-browser via Web Audio API.
 * No external URLs or CDN assets; works fully offline within the app bundle.
 */
export async function playChatbotNotificationTone(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return false;

  try {
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const playBeep = (freq: number, start: number, duration = 0.11) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.1, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const t = ctx.currentTime;
    playBeep(784, t);
    playBeep(988, t + 0.13);
    window.setTimeout(() => void ctx.close(), 450);
    return true;
  } catch {
    return false;
  }
}

const NOTIFY_SOUND_KEY = 'bahram_chatbot_notify_sound';

/** Soft chime when the assistant replies — plays on each completed response. */
export async function playChatbotReplyTone(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return false;

  try {
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const playBeep = (freq: number, start: number, duration = 0.14, volume = 0.08) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const t = ctx.currentTime;
    playBeep(659, t, 0.12, 0.07);
    playBeep(880, t + 0.1, 0.16, 0.06);
    window.setTimeout(() => void ctx.close(), 400);
    return true;
  } catch {
    return false;
  }
}

export function wasChatbotNotifySoundPlayed(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(NOTIFY_SOUND_KEY) === '1';
}

export function markChatbotNotifySoundPlayed(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(NOTIFY_SOUND_KEY, '1');
}
