'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useLenis } from 'lenis/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  HelpCircle,
  Instagram,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Phone,
  Radio,
  Reply,
  Send,
  Sparkles,
  Tag,
  User,
  X,
} from 'lucide-react';
import { CaptchaField, useCaptchaGate, type CaptchaFieldHandle } from '@/components/captcha/CaptchaField';
import { ChatMessageComposer } from '@/components/chatbot/ChatMessageComposer';
import type { ChatbotReplyMode } from '@/components/chatbot/ChatbotReplyModeModal';
import { ChatbotVisitorIntro } from '@/components/chatbot/ChatbotVisitorIntro';
import { ChatMessageRating } from '@/components/chatbot/ChatMessageRating';
import { ThinkingIndicator } from '@/components/chatbot/ThinkingIndicator';
import { TypingText } from '@/components/chatbot/TypingText';
import { clearCaptchaTrust, isCaptchaTrusted, markCaptchaTrusted } from '@/lib/captcha/trust';
import type { CaptchaPayload } from '@/lib/captcha/types';
import { FaqAccordion } from '@/components/FaqAccordion';
import { siteConfig } from '@/config/site';
import { sendChatbotMessage, rateChatbotMessage, submitChatbotRatingFeedback, queueChatbotVisitorMessage, saveChatbotVisitorInfo } from '@/lib/chatbot/actions';
import { pollChatbotUpdatesClient } from '@/lib/chatbot/poll.client';
import {
  CHATBOT_UNAVAILABLE_REPLY,
  chatbotRateLimitReply,
  unavailableFallbackCtasFromPublic,
} from '@/lib/chatbot/prompt';
import { verifyChatbotCaptchaClient } from '@/lib/chatbot/verifyCaptcha.client';
import { loadChatHistory, scheduleSaveChatHistory } from '@/lib/chatbot/history';
import { loadSavedChatbotPhone, markChatbotPhoneSaved } from '@/lib/chatbot/phone';
import {
  hasVisitorIntroBeenShown,
  loadGlobalVisitorName,
  loadSavedVisitorName,
  markVisitorIntroShown,
  markVisitorNameSaved,
} from '@/lib/chatbot/visitor';
import { withRegisterPhoneCta } from '@/lib/chatbot/phoneCta';
import {
  markChatbotNotifySoundPlayed,
  playChatbotNotificationTone,
  playChatbotReplyTone,
  wasChatbotNotifySoundPlayed,
} from '@/lib/chatbot/notificationSound';
import { resolveVisitorIpClient } from '@/lib/request/resolveVisitorIp.client';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import type {
  ChatbotCta,
  ChatbotMessage,
  ChatbotOperatorProfile,
  ChatbotPublicConfig,
  ChatbotQuickSuggestion,
} from '@/lib/chatbot/types';
import { activeQuickSuggestions, resolveQuickSuggestions } from '@/lib/chatbot/quickSuggestions';
import type { FaqGroup } from '@/lib/data/chatbotFaq';
import { loadChatbotFaqGroups } from '@/lib/chatbot/faqLoader';
import { track } from '@/lib/analytics';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { sitePhotos } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';
import { useDataTheme } from '@/lib/useDataTheme';
import { chatbotThemeClasses, chatbotCtaButtonClass, type ChatbotTheme } from '@/lib/chatbot/themeClasses';
import { CHAT_GLASS_SURFACE } from '@/lib/chatbot/emojiFont';
import { ChatRichText } from '@/components/chatbot/ChatRichText';

const ChatbotPhoneModal = dynamic(
  () => import('@/components/chatbot/ChatbotPhoneModal').then((m) => ({ default: m.ChatbotPhoneModal })),
  { ssr: false },
);
const ChatbotReplyModeModal = dynamic(
  () => import('@/components/chatbot/ChatbotReplyModeModal').then((m) => ({ default: m.ChatbotReplyModeModal })),
  { ssr: false },
);

const SESSION_KEY = 'bahram_chatbot_session';

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSessionId(): string {
  if (typeof window === 'undefined') return newSessionId();
  let id = localStorage.getItem(SESSION_KEY);
  if (!id || !UUID_RE.test(id)) {
    id = newSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function ctaHref(cta: ChatbotCta): string {
  if (cta.type === 'whatsapp') return `https://wa.me/${siteConfig.contact.whatsappRaw}`;
  if (cta.type === 'phone') return `tel:${siteConfig.contact.phoneRaw}`;
  return cta.href.startsWith('/') ? cta.href : `/${cta.href}`;
}

function CtaIcon({ type }: { type: ChatbotCta['type'] }) {
  if (type === 'consultation') return <Sparkles className="h-3.5 w-3.5" />;
  if (type === 'pricing') return <Tag className="h-3.5 w-3.5" />;
  if (type === 'phone' || type === 'register_phone') return <Phone className="h-3.5 w-3.5" />;
  if (type === 'whatsapp') return <MessageCircle className="h-3.5 w-3.5" />;
  return null;
}

interface FloatingChatbotProps {
  config: ChatbotPublicConfig;
  faqGroups: FaqGroup[];
  aiAvailable: boolean;
  lazyLoadFaqs?: boolean;
  initialOpen?: boolean;
}

type AssistantTab = 'chat' | 'contact' | 'faq';

const TAB_ITEM_BASE =
  'relative flex flex-1 flex-col items-center gap-0.5 rounded-[9px] py-1.5 text-[10px] font-medium transition-all duration-200 ease-out';

/** iOS-style frosted glass pill (composer, captcha). */
const CHAT_GLASS_PILL = cn('relative overflow-hidden rounded-[22px]', CHAT_GLASS_SURFACE);

/** Bottom dock — same surface as the message thread. */
const CHAT_DOCK =
  'relative isolate mt-auto shrink-0 overflow-hidden border-t';

const TAB_META: Record<AssistantTab, { label: string; subtitle: string }> = {
  chat: { label: 'چت هوشمند', subtitle: 'پاسخگوی هوشمند آکادمی بهرام' },
  contact: { label: 'راه‌های ارتباط', subtitle: 'تماس مستقیم با تیم بهرام' },
  faq: { label: 'سوالات متداول', subtitle: 'پاسخ سریع به پرسش‌های رایج' },
};

const OPERATOR_ACK_MESSAGE = 'پیام شما ثبت شد. لطفاً منتظر پاسخ اپراتور بمانید.';

const LOW_RATING_FOLLOWUP =
  'متأسفیم که این پاسخ رضایت‌بخش نبود. لطفاً کوتاه بگویید چه مشکل یا کمبودی دیدید تا سریع‌تر پیگیری کنیم.';

const LOW_RATING_FEEDBACK_ACK =
  'ممنون از توضیح شما. بازخورد شما ثبت شد و تیم آکادمی در جریان قرار گرفت.';

function headerFromLastReply(
  messages: ChatbotMessage[],
  assistantName: string,
): ChatHeaderPresentation {
  const aiPresentation: ChatHeaderPresentation = {
    showsOperator: false,
    title: assistantName,
    subtitle: TAB_META.chat.subtitle,
  };

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || msg.pending) continue;

    if (msg.fromOperator || msg.id.startsWith('op-')) {
      return {
        showsOperator: true,
        title: msg.operatorName ?? 'اپراتور بهرام',
        subtitle: 'پاسخ توسط اپراتور بهرام',
        avatarUrl: msg.operatorAvatarUrl,
      };
    }

    if (msg.isOperatorAck) {
      return {
        showsOperator: true,
        title: 'اپراتور بهرام',
        subtitle: 'در انتظار پاسخ اپراتور',
      };
    }

    if (msg.isAiReply) {
      return aiPresentation;
    }

    if (msg.id.startsWith('rl-') || msg.id.startsWith('f-') || msg.error) continue;

    if (msg.id === 'welcome') {
      return aiPresentation;
    }
  }

  return aiPresentation;
}

function latestReplyMessageKey(messages: ChatbotMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || msg.pending) continue;
    if (msg.fromOperator || msg.id.startsWith('op-')) return msg.id;
    if (msg.isOperatorAck) return msg.id;
    if (msg.isAiReply) return msg.id;
    if (msg.id.startsWith('rl-') || msg.id.startsWith('f-') || msg.error) continue;
    if (msg.id === 'welcome') return msg.id;
  }
  return null;
}

interface ChatHeaderPresentation {
  showsOperator: boolean;
  title: string;
  subtitle: string;
  avatarUrl?: string;
}

function scrollChatToBottom(el: HTMLDivElement | null, smooth = true) {
  el?.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function OperatorAvatar({
  name,
  avatarUrl,
  className,
  iconClassName,
}: {
  name: string;
  avatarUrl?: string;
  className: string;
  iconClassName?: string;
}) {
  if (avatarUrl) {
    return (
      <DirectMediaImg
        src={avatarUrl}
        alt={name}
        className={cn(className, 'object-cover')}
      />
    );
  }

  return (
    <span className={cn(className, 'grid place-items-center')}>
      <User className={iconClassName ?? 'h-[18px] w-[18px]'} />
    </span>
  );
}

const OPERATOR_AVATAR_RING_BASE =
  'relative shrink-0 overflow-hidden rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.12)]';

const OPERATOR_STACK_MAX = 4;
const OPERATOR_STACK_SIZE_PX = 44;
/** ~50% overlap — each avatar tucks in to the previous circle's center. */
const OPERATOR_STACK_OVERLAP = '-ms-[22px]';

function pickRandomProfiles(
  profiles: ChatbotOperatorProfile[],
  count: number,
): ChatbotOperatorProfile[] {
  if (profiles.length <= count) return profiles;
  const shuffled = [...profiles];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function OperatorAvatarStack({
  profiles,
  maxVisible = OPERATOR_STACK_MAX,
  ringClass,
}: {
  profiles: ChatbotOperatorProfile[];
  maxVisible?: number;
  ringClass: string;
}) {
  const profileKey = profiles.map((p) => p.id).join('\0');
  const visible = useMemo(
    () => pickRandomProfiles(profiles, maxVisible),
    [profileKey, maxVisible, profiles],
  );

  if (visible.length === 0) {
    return (
      <span className={cn('grid h-11 w-11 place-items-center', OPERATOR_AVATAR_RING_BASE, ringClass)}>
        <User className="h-[18px] w-[18px]" />
      </span>
    );
  }

  if (visible.length === 1) {
    return (
      <OperatorAvatar
        name={visible[0].name}
        avatarUrl={visible[0].avatar_url}
        className={cn('h-11 w-11 rounded-full', OPERATOR_AVATAR_RING_BASE, ringClass)}
        iconClassName="h-[18px] w-[18px]"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-start"
      dir="ltr"
      aria-hidden
      style={{
        width: OPERATOR_STACK_SIZE_PX + (visible.length - 1) * (OPERATOR_STACK_SIZE_PX / 2),
      }}
    >
      {visible.map((profile, index) => (
        <div
          key={profile.id}
          className={cn('h-11 w-11', OPERATOR_AVATAR_RING_BASE, ringClass, index > 0 && OPERATOR_STACK_OVERLAP)}
          style={{ zIndex: visible.length - index }}
        >
          <OperatorAvatar
            name={profile.name}
            avatarUrl={profile.avatar_url}
            className="h-full w-full rounded-full"
            iconClassName="h-4 w-4"
          />
        </div>
      ))}
    </div>
  );
}

const REPLY_MODE_STORAGE_KEY = 'bahram_chatbot_reply_mode';

function ReplyModeSwitch({
  value,
  onChange,
  aiDisabled,
  vertical = false,
}: {
  value: ChatbotReplyMode;
  onChange: (mode: ChatbotReplyMode) => void;
  aiDisabled?: boolean;
  vertical?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-white/15 p-0.5',
        vertical ? 'flex flex-col gap-0.5 rounded-lg' : 'flex rounded-pill',
      )}
      role="group"
      aria-label="نوع پاسخ‌دهنده"
    >
      <button
        type="button"
        disabled={aiDisabled}
        onClick={() => onChange('ai')}
        aria-pressed={value === 'ai'}
        aria-label="دستیار AI"
        className={cn(
          'font-semibold transition',
          vertical
            ? 'grid h-7 w-7 place-items-center rounded-md'
            : 'flex flex-1 items-center justify-center gap-1 rounded-pill px-2.5 py-1 text-[10px]',
          value === 'ai' ? 'bg-white/30 text-white shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white',
          aiDisabled && 'cursor-not-allowed opacity-40',
        )}
      >
        <Bot className="h-3.5 w-3.5 shrink-0" />
        {!vertical && 'AI'}
      </button>
      <button
        type="button"
        onClick={() => onChange('operator')}
        aria-pressed={value === 'operator'}
        aria-label="اپراتور"
        className={cn(
          'font-semibold transition',
          vertical
            ? 'grid h-7 w-7 place-items-center rounded-md'
            : 'flex flex-1 items-center justify-center gap-1 rounded-pill px-2.5 py-1 text-[10px]',
          value === 'operator'
            ? 'bg-white/30 text-white shadow-sm'
            : 'text-white/75 hover:bg-white/10 hover:text-white',
        )}
      >
        <User className="h-3.5 w-3.5 shrink-0" />
        {!vertical && 'اپراتور'}
      </button>
    </div>
  );
}

const LAUNCHER_LABEL_VISIBLE_MS = 4_500;
const LAUNCHER_LABEL_HIDDEN_MS = 2_800;
const LAUNCHER_SCROLL_IDLE_MS = 280;

function ChatbotMessageVideo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="mb-2 overflow-hidden rounded-md bg-black/[0.04]">
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="max-h-44 w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ChatbotFloatingLauncher({
  assistantName,
  open,
  chatTheme,
  hasNewMessage,
  onOpen,
  onToggle,
}: {
  assistantName: string;
  open: boolean;
  chatTheme: ChatbotTheme;
  hasNewMessage: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const lenis = useLenis();
  const primaryLabel = assistantName.trim() || 'از من بپرس!';
  const hints = useMemo(
    () => Array.from(new Set([primaryLabel, 'سوال داری؟ بپرس'])),
    [primaryLabel],
  );
  const [hintIndex, setHintIndex] = useState(0);
  const [labelVisible, setLabelVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [scrollActive, setScrollActive] = useState(false);

  useEffect(() => {
    if (open) {
      setScrollActive(false);
      return;
    }

    let idleTimer = 0;

    const onScrollActivity = () => {
      setScrollActive(true);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        setScrollActive(false);
      }, LAUNCHER_SCROLL_IDLE_MS);
    };

    if (lenis) {
      lenis.on('scroll', onScrollActivity);
      return () => {
        lenis.off('scroll', onScrollActivity);
        window.clearTimeout(idleTimer);
      };
    }

    window.addEventListener('scroll', onScrollActivity, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollActivity);
      window.clearTimeout(idleTimer);
    };
  }, [open, lenis]);

  useEffect(() => {
    if (open) {
      setLabelVisible(false);
      return;
    }

    if (hasNewMessage) {
      setLabelVisible(true);
      return;
    }

    if (scrollActive) {
      setLabelVisible(false);
      return;
    }

    if (hovered) {
      setLabelVisible(true);
      return;
    }

    let cancelled = false;
    let timeoutId = 0;

    const schedule = (fn: () => void, delay: number) => {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };

    const runCycle = () => {
      setLabelVisible(true);
      schedule(() => {
        setLabelVisible(false);
        schedule(() => {
          setHintIndex((index) => (index + 1) % hints.length);
          runCycle();
        }, LAUNCHER_LABEL_HIDDEN_MS);
      }, LAUNCHER_LABEL_VISIBLE_MS);
    };

    runCycle();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [open, hovered, hints.length, scrollActive, hasNewMessage]);

  const showLabel = !open && labelVisible;
  const labelText = hasNewMessage ? 'پیام جدیدی دارید' : hints[hintIndex];

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3",
        open && "max-lg:hidden",
      )}
      dir="ltr"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence mode="wait">
        {showLabel ? (
          <motion.button
            key={labelText}
            type="button"
            onClick={onOpen}
            dir="rtl"
            initial={{ opacity: 0, x: 18, scale: 0.9, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 12, scale: 0.94, filter: 'blur(3px)' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative overflow-hidden rounded-pill border px-3 py-2 text-[11px] font-bold shadow-floating backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-95 sm:px-4 sm:py-2.5 sm:text-[12px]',
              hasNewMessage ? 'inline-flex border-accent/35 bg-accent/10 text-accent' : 'hidden border-emerald/25 lg:inline-flex',
              chatTheme.launcherPill,
            )}
          >
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 rounded-pill bg-gradient-to-l via-transparent',
                hasNewMessage ? 'from-accent/[0.12] to-gold/[0.08]' : 'from-emerald/[0.14] to-gold/[0.1]',
              )}
            />
            <span className="relative z-10 whitespace-nowrap">{labelText}</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onToggle}
        aria-label={
          open
            ? 'بستن پنل پشتیبانی'
            : hasNewMessage
              ? 'پیام جدیدی دارید — پشتیبانی و تماس'
              : 'پشتیبانی و تماس'
        }
        animate={open ? { scale: 1 } : { scale: [1, 1.045, 1] }}
        transition={
          open
            ? { duration: 0.2 }
            : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
        }
        className={cn(
          'relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-premium transition-shadow hover:shadow-glow active:scale-95',
          chatTheme.launcherRing,
          'ring-4',
          open ? 'bg-primary' : 'bg-gradient-ai shadow-glow',
        )}
      >
        {!open && hasNewMessage ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 z-20 h-3 w-3 rounded-full bg-accent ring-2 ring-white"
          />
        ) : null}
        {open ? <X className="relative z-10 h-6 w-6" /> : <MessagesSquare className="relative z-10 h-6 w-6" />}
      </motion.button>
    </div>
  );
}

export function FloatingChatbot({
  config,
  faqGroups: initialFaqGroups,
  aiAvailable,
  lazyLoadFaqs,
  initialOpen = false,
}: FloatingChatbotProps) {
  const chatEnabled = config.enabled;
  const defaultTab: AssistantTab = chatEnabled ? 'chat' : 'contact';
  const operatorMode = chatEnabled && !aiAvailable;

  const [open, setOpen] = useState(initialOpen);
  const [tab, setTab] = useState<AssistantTab>(defaultTab);
  const [faqGroups, setFaqGroups] = useState<FaqGroup[]>(initialFaqGroups);
  const [faqLoading, setFaqLoading] = useState(false);
  const faqFetchAttemptedRef = useRef(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(getSessionId);
  const [initialized, setInitialized] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const honeypotId = useId();
  const [honeypot, setHoneypot] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageDomRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const clientIpRef = useRef<string | undefined>(undefined);
  const captcha = useCaptchaGate();
  const [captchaTrusted, setCaptchaTrusted] = useState(false);
  const [verifyingCaptcha, setVerifyingCaptcha] = useState(false);
  const verifyInFlightRef = useRef(false);
  const captchaFieldRef = useRef<CaptchaFieldHandle>(null);
  const openRef = useRef(false);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [replyModeModalOpen, setReplyModeModalOpen] = useState(false);
  const [preferredReplyMode, setPreferredReplyMode] = useState<ChatbotReplyMode>(() =>
    chatEnabled && aiAvailable ? 'ai' : 'operator',
  );
  const [headerModeOverride, setHeaderModeOverride] = useState<ChatbotReplyMode | null>(null);
  const lastReplyHeaderKeyRef = useRef<string | null>(null);
  const lastLogIdRef = useRef(0);
  const lowRatingFeedbackRef = useRef<{ logId: number } | null>(null);
  const [awaitingLowRatingFeedback, setAwaitingLowRatingFeedback] = useState(false);
  const [visitorFirstName, setVisitorFirstName] = useState('');
  const [visitorLastName, setVisitorLastName] = useState('');
  const [showVisitorIntro, setShowVisitorIntro] = useState(false);
  const operatorActive =
    operatorMode || preferredReplyMode === 'operator';
  const showReplyModeSwitch = tab === 'chat' && chatEnabled;
  const dataTheme = useDataTheme();
  const chatTheme = useMemo(() => chatbotThemeClasses(dataTheme), [dataTheme]);

  const welcomeVideoUrl = useMemo(() => {
    const configured = config.welcome_video_url?.trim();
    if (configured) return resolveMediaUrl(configured);
    return sitePhotos.chatbotWelcomeVideo;
  }, [config.welcome_video_url]);

  const quickSuggestions = useMemo(
    () =>
      activeQuickSuggestions(
        resolveQuickSuggestions(config.quick_suggestions, {
          useDefaults: config.quick_suggestions === undefined,
        }),
      ),
    [config.quick_suggestions],
  );

  /** Skip polling when visitor only uses AI — saves server + battery. */
  const needsOperatorPoll = useMemo(() => {
    if (operatorActive) return true;
    return messages.some((m) => m.fromOperator || m.isOperatorAck);
  }, [operatorActive, messages]);

  useEffect(() => {
    openRef.current = open;
    if (open) setHasNewMessage(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (!isMobile) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(REPLY_MODE_STORAGE_KEY);
      if (saved === 'ai' || saved === 'operator') {
        if (saved === 'ai' && !aiAvailable) return;
        setPreferredReplyMode(saved);
      }
    } catch {
      /* ignore */
    }
  }, [aiAvailable]);

  useEffect(() => {
    if (operatorMode) {
      setPreferredReplyMode('operator');
      setHeaderModeOverride(null);
    }
  }, [operatorMode]);

  useEffect(() => {
    const replyKey = latestReplyMessageKey(messages);
    if (replyKey && replyKey !== lastReplyHeaderKeyRef.current) {
      lastReplyHeaderKeyRef.current = replyKey;
      setHeaderModeOverride(null);
    }
  }, [messages]);

  useEffect(() => {
    setCaptchaTrusted(isCaptchaTrusted());
    setSavedPhone(loadSavedChatbotPhone(sessionId));
    const savedName = loadSavedVisitorName(sessionId);
    const globalName = loadGlobalVisitorName();
    setVisitorFirstName(savedName.firstName || globalName.firstName);
    setVisitorLastName(savedName.lastName || globalName.lastName);
    const shouldShowIntro = !hasVisitorIntroBeenShown();
    setShowVisitorIntro(shouldShowIntro);
    if (shouldShowIntro) {
      markVisitorIntroShown();
    }
  }, [sessionId]);

  const dismissVisitorIntro = useCallback(() => {
    setShowVisitorIntro(false);
  }, []);

  const lastVisitorSaveRef = useRef('');

  useEffect(() => {
    const first = visitorFirstName.trim();
    const last = visitorLastName.trim();
    if (!first && !last) return;

    const key = `${first}|${last}`;
    if (key === lastVisitorSaveRef.current) return;

    const timer = window.setTimeout(() => {
      lastVisitorSaveRef.current = key;
      markVisitorNameSaved(sessionId, visitorFirstName, visitorLastName);
      void saveChatbotVisitorInfo({
        sessionId,
        visitorFirstName,
        visitorLastName,
        clientIp: clientIpRef.current,
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [visitorFirstName, visitorLastName, sessionId]);

  const showCaptcha = config.require_captcha && !captchaTrusted;
  const chatInputLocked = showCaptcha;

  const verifyCaptcha = useCallback(
    async (payload: CaptchaPayload | null) => {
      if (!payload || verifyInFlightRef.current) return;
      verifyInFlightRef.current = true;
      setVerifyingCaptcha(true);
      setErrorHint(null);
      const visitorIp = clientIpRef.current ?? (await resolveVisitorIpClient());
      if (visitorIp) clientIpRef.current = visitorIp;

      const result = await verifyChatbotCaptchaClient({
        sessionId,
        clientIp: visitorIp,
        payload,
      });

      if (result.ok) {
        markCaptchaTrusted();
        setCaptchaTrusted(true);
        setErrorHint(null);
        dismissVisitorIntro();
      } else if (isCaptchaTrusted()) {
        setCaptchaTrusted(true);
        setErrorHint(null);
      } else {
        const hint =
          result.error === 'rate_limit'
            ? 'تعداد تلاش زیاد بود. چند ثانیه صبر کنید و دوباره امتحان کنید.'
            : result.error === 'network'
              ? 'اتصال به سرور برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.'
              : 'پاسخ کپچا اشتباه است. دوباره تلاش کنید.';
        if (result.error === 'captcha') {
          clearCaptchaTrust();
          setCaptchaTrusted(false);
          captcha.reset();
        }
        setErrorHint(hint);
      }

      verifyInFlightRef.current = false;
      setVerifyingCaptcha(false);
    },
    [captcha, sessionId, dismissVisitorIntro],
  );

  const handleHumanVerified = useCallback(
    (payload: CaptchaPayload) => {
      void verifyCaptcha(payload);
    },
    [verifyCaptcha],
  );

  const handleCaptchaSubmit = useCallback(
    (payload?: CaptchaPayload) => {
      if (verifyingCaptcha || verifyInFlightRef.current) return;
      const p = payload ?? captchaFieldRef.current?.getPayload();
      if (!p?.captcha_id || !p.captcha_answer?.trim()) {
        setErrorHint('لطفاً پاسخ کپچا را وارد کنید.');
        return;
      }
      void verifyCaptcha(p);
    },
    [verifyingCaptcha, verifyCaptcha],
  );

  const historyHydratedRef = useRef(false);
  const notifySoundPlayedRef = useRef(false);

  useEffect(() => {
    void resolveVisitorIpClient().then((ip) => {
      if (ip) clientIpRef.current = ip;
    });
  }, []);

  useEffect(() => {
    if (historyHydratedRef.current) return;
    historyHydratedRef.current = true;
    const stored = loadChatHistory(sessionId);
    if (stored.length > 0) {
      setMessages(stored);
      setInitialized(true);
      return;
    }

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: config.welcome_message,
        videoUrl: welcomeVideoUrl,
      },
    ]);
    setInitialized(true);
    setHasNewMessage(true);
  }, [sessionId, config.welcome_message, welcomeVideoUrl]);

  useEffect(() => {
    if (!initialized || messages.length === 0) return;
    scheduleSaveChatHistory(sessionId, messages);
  }, [messages, sessionId, initialized]);

  useEffect(() => {
    if (!open) return;
    track('chatbot_open', { session: sessionId });
  }, [open, sessionId]);

  useEffect(() => {
    if (chatEnabled) return;
    if (tab === 'chat') setTab('contact');
  }, [chatEnabled, tab]);

  useEffect(() => {
    if (open || notifySoundPlayedRef.current || wasChatbotNotifySoundPlayed()) return;

    let cancelled = false;

    async function tryPlay() {
      if (cancelled || notifySoundPlayedRef.current) return;
      const played = await playChatbotNotificationTone();
      if (played && !cancelled) {
        notifySoundPlayedRef.current = true;
        markChatbotNotifySoundPlayed();
      }
    }

    const timer = window.setTimeout(() => void tryPlay(), 1500);

    const onInteract = () => {
      void tryPlay();
    };
    window.addEventListener('pointerdown', onInteract, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onInteract);
    };
  }, [open]);

  useEffect(() => {
    if (tab !== 'chat') return;
    scrollChatToBottom(scrollRef.current);
  }, [messages, sending, tab]);

  useEffect(() => {
    const maxId = messages.reduce((max, msg) => Math.max(max, msg.logId ?? 0), 0);
    lastLogIdRef.current = Math.max(lastLogIdRef.current, maxId);
  }, [messages]);

  const scrollPendingRef = useRef(false);

  const handleTypingComplete = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, typing: false } : m)));
    scrollChatToBottom(scrollRef.current);
  }, []);

  const handleTypingProgress = useCallback(() => {
    if (scrollPendingRef.current) return;
    scrollPendingRef.current = true;
    requestAnimationFrame(() => {
      scrollPendingRef.current = false;
      scrollChatToBottom(scrollRef.current, false);
    });
  }, []);

  const resolveQuotedMessageId = useCallback(
    (logId: number, preview?: string): string | null => {
      const userByLog = messages.find((m) => m.role === 'user' && m.logId === logId);
      if (userByLog) return userByLog.id;

      const byLogIdx = messages.findIndex((m) => m.logId === logId);
      if (byLogIdx >= 0) {
        if (messages[byLogIdx].role === 'user') return messages[byLogIdx].id;
        for (let i = byLogIdx - 1; i >= 0; i--) {
          if (messages[i].role === 'user') return messages[i].id;
        }
      }

      const trimmedPreview = preview?.trim();
      if (trimmedPreview) {
        const exact = messages.find(
          (m) => m.role === 'user' && m.content?.trim() === trimmedPreview,
        );
        if (exact) return exact.id;

        const prefix = trimmedPreview.slice(0, 80);
        const partial = messages.find(
          (m) => m.role === 'user' && m.content?.trim().startsWith(prefix),
        );
        if (partial) return partial.id;
      }

      return null;
    },
    [messages],
  );

  const scrollToQuotedMessage = useCallback(
    (logId: number, preview?: string) => {
      const targetId = resolveQuotedMessageId(logId, preview);
      if (!targetId) return;

      const el = messageDomRefs.current.get(targetId);
      if (!el) return;

      setHighlightMessageId(targetId);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => setHighlightMessageId(null), 1600);
    },
    [resolveQuotedMessageId],
  );

  const resolveReplyPreview = useCallback(
    (replyToLogId?: number, replyToPreview?: string) => {
      if (replyToPreview?.trim()) return replyToPreview.trim();
      if (!replyToLogId) return null;

      const userTarget = messages.find((m) => m.role === 'user' && m.logId === replyToLogId);
      if (userTarget?.content?.trim()) return userTarget.content.trim();

      const byLogIdx = messages.findIndex((m) => m.logId === replyToLogId);
      if (byLogIdx >= 0) {
        for (let i = byLogIdx - 1; i >= 0; i--) {
          if (messages[i].role === 'user' && messages[i].content?.trim()) {
            return messages[i].content.trim();
          }
        }
      }

      return null;
    },
    [messages],
  );

  const notifyNewMessageIfClosed = useCallback(() => {
    if (openRef.current) return;
    setHasNewMessage(true);
  }, []);

  useEffect(() => {
    if (initialFaqGroups.length > 0) {
      setFaqGroups(initialFaqGroups);
    }
  }, [initialFaqGroups]);

  useEffect(() => {
    if (!lazyLoadFaqs || tab !== 'faq') return;
    if (faqGroups.length > 0) return;
    if (faqFetchAttemptedRef.current) return;

    faqFetchAttemptedRef.current = true;
    let active = true;
    setFaqLoading(true);
    void loadChatbotFaqGroups()
      .then((groups) => {
        if (active) setFaqGroups(groups);
      })
      .finally(() => {
        if (active) setFaqLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lazyLoadFaqs, tab, faqGroups.length]);

  useEffect(() => {
    if (!chatEnabled || !needsOperatorPoll) return;

    let cancelled = false;
    let timerId = 0;

    async function pollOperatorReplies() {
      const updates = await pollChatbotUpdatesClient({
        sessionId,
        afterLogId: lastLogIdRef.current,
      });
      if (cancelled || updates.length === 0) return;

      const replies = updates.filter((item) => item.kind === 'operator_reply');
      if (replies.length === 0) return;

      const newMessages: ChatbotMessage[] = [];
      for (const reply of replies) {
        lastLogIdRef.current = Math.max(lastLogIdRef.current, reply.id);
        newMessages.push({
          id: `op-${reply.id}`,
          role: 'assistant',
          content: reply.content ?? '',
          logId: reply.id,
          fromOperator: true,
          operatorName: reply.operator_name ?? 'اپراتور بهرام',
          operatorAvatarUrl: reply.operator_avatar_url ?? undefined,
          replyToLogId: reply.reply_to_log_id ?? undefined,
          replyToPreview: reply.reply_to_preview ?? undefined,
          ...(reply.rating ? { rating: reply.rating } : {}),
          typing: true,
        });
      }

      if (newMessages.length === 0) return;

      void playChatbotReplyTone();
      notifyNewMessageIfClosed();
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const toAdd = newMessages.filter((m) => !existing.has(m.id));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
      window.setTimeout(() => scrollChatToBottom(scrollRef.current), 320);
    }

    const pollIntervalMs = () => {
      if (document.hidden) return 30_000;
      if (open && tab === 'chat') return 8_000;
      return 18_000;
    };

    const schedule = () => {
      timerId = window.setTimeout(async () => {
        if (cancelled) return;
        if (!document.hidden) await pollOperatorReplies();
        if (!cancelled) schedule();
      }, pollIntervalMs());
    };

    void pollOperatorReplies();
    schedule();

    const onVisibility = () => {
      if (document.hidden || cancelled) return;
      window.clearTimeout(timerId);
      void pollOperatorReplies().finally(() => {
        if (!cancelled) schedule();
      });
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [chatEnabled, needsOperatorPoll, sessionId, notifyNewMessageIfClosed, open, tab]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    dismissVisitorIntro();

    if (showCaptcha) {
      setErrorHint('ابتدا کپچا را درست حل و تأیید کنید.');
      return;
    }

    setErrorHint(null);
    setSending(true);
    if (!overrideText) setInput('');

    const userMsg: ChatbotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const pendingId = `p-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: pendingId,
        role: 'assistant',
        content: operatorActive ? 'در حال ارسال به اپراتور…' : 'در حال نوشتن پاسخ…',
        pending: true,
      },
    ]);

    try {
    track('chatbot_message', { session: sessionId });

    const history = messages
      .filter((m) => !m.pending && !m.typing && m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    const visitorIp = clientIpRef.current ?? (await resolveVisitorIpClient());
    if (visitorIp) clientIpRef.current = visitorIp;

    if (lowRatingFeedbackRef.current) {
      const ratedLogId = lowRatingFeedbackRef.current.logId;
      lowRatingFeedbackRef.current = null;

      const feedbackRes = await submitChatbotRatingFeedback({
        sessionId,
        logId: ratedLogId,
        feedback: text,
        clientIp: visitorIp,
      });

      if (!feedbackRes.ok) {
        if (feedbackRes.error === 'duplicate') {
          lowRatingFeedbackRef.current = null;
          setAwaitingLowRatingFeedback(false);
        } else {
          lowRatingFeedbackRef.current = { logId: ratedLogId };
          setAwaitingLowRatingFeedback(true);
        }
        setMessages((prev) => prev.filter((m) => m.id !== pendingId && m.id !== userMsg.id));
        setInput(text);
        setErrorHint(
          feedbackRes.error === 'duplicate'
            ? 'بازخورد شما قبلاً ثبت شده است.'
            : 'ثبت بازخورد ناموفق بود. لطفاً دوباره تلاش کنید.',
        );
        return;
      }

      if (feedbackRes.queuedLogId) {
        lastLogIdRef.current = Math.max(lastLogIdRef.current, feedbackRes.queuedLogId);
      }

      setAwaitingLowRatingFeedback(false);
      void playChatbotReplyTone();
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== pendingId)
          .concat({
            id: `lr-${Date.now()}`,
            role: 'assistant',
            content: LOW_RATING_FEEDBACK_ACK,
            isAiReply: true,
            typing: true,
          }),
      );
      if (!operatorActive) {
        setReplyModeModalOpen(true);
      }
      notifyNewMessageIfClosed();
      return;
    }

    if (operatorActive) {
      const queued = await queueChatbotVisitorMessage({
        sessionId,
        message: text,
        clientIp: visitorIp,
        honeypot,
      });

      if (!queued.ok) {
        if (queued.error === 'captcha' || queued.error === 'bot') {
          clearCaptchaTrust();
          setCaptchaTrusted(false);
          captcha.reset();
          setInput(text);
          setErrorHint(
            queued.error === 'bot'
              ? 'درخواست نامعتبر بود.'
              : 'تأیید امنیتی منقضی شده — لطفاً دوباره کپچا را درست حل کنید.',
          );
          setMessages((prev) => prev.filter((m) => m.id !== pendingId && m.id !== userMsg.id));
          return;
        }

        if (queued.error === 'rate_limit') {
          setErrorHint(null);
          void playChatbotReplyTone();
          setMessages((prev) =>
            prev
              .filter((m) => m.id !== pendingId)
              .concat({
                id: `rl-${Date.now()}`,
                role: 'assistant',
                content: chatbotRateLimitReply(queued.retryAfter),
                typing: true,
              }),
          );
          notifyNewMessageIfClosed();
          return;
        }

        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        setErrorHint('ارسال پیام ناموفق بود. لطفاً دوباره تلاش کنید.');
        return;
      }

      if (queued.logId) {
        lastLogIdRef.current = Math.max(lastLogIdRef.current, queued.logId);
      }

      markCaptchaTrusted();
      setCaptchaTrusted(true);
      void playChatbotReplyTone();
      setMessages((prev) =>
        prev
          .map((m) => (m.id === userMsg.id && queued.logId ? { ...m, logId: queued.logId } : m))
          .filter((m) => m.id !== pendingId)
          .concat({
            id: `ack-${Date.now()}`,
            role: 'assistant',
            content: OPERATOR_ACK_MESSAGE,
            isOperatorAck: true,
            typing: true,
          }),
      );
      return;
    }

    const result = await sendChatbotMessage({
      sessionId,
      message: text,
      history,
      clientIp: visitorIp,
      honeypot,
    });

    if (!result.ok) {
      if (result.error === 'captcha' || result.error === 'bot') {
        clearCaptchaTrust();
        setCaptchaTrusted(false);
        captcha.reset();
        setInput(text);
        setErrorHint(
          result.error === 'bot'
            ? 'درخواست نامعتبر بود.'
            : 'تأیید امنیتی منقضی شده — لطفاً دوباره کپچا را درست حل کنید.',
        );
        setMessages((prev) => prev.filter((m) => m.id !== pendingId && m.id !== userMsg.id));
        return;
      }

      setErrorHint(null);

      if (result.error === 'rate_limit') {
        void playChatbotReplyTone();
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== pendingId)
            .concat({
              id: `rl-${Date.now()}`,
              role: 'assistant',
              content: chatbotRateLimitReply(result.retryAfter),
              typing: true,
            }),
        );
        notifyNewMessageIfClosed();
        return;
      }

      if (result.error === 'ai_disabled') {
        const queued = await queueChatbotVisitorMessage({
          sessionId,
          message: text,
          clientIp: visitorIp,
          honeypot,
        });
        if (queued.ok) {
          if (queued.logId) {
            lastLogIdRef.current = Math.max(lastLogIdRef.current, queued.logId);
          }
          void playChatbotReplyTone();
          setMessages((prev) =>
            prev
              .filter((m) => m.id !== pendingId)
              .concat({
                id: `ack-${Date.now()}`,
                role: 'assistant',
                content: OPERATOR_ACK_MESSAGE,
                isOperatorAck: true,
                typing: true,
              }),
          );
          return;
        }
      }

      const fallbackCtas =
        result.fallbackCtas?.length ? result.fallbackCtas : unavailableFallbackCtasFromPublic(config);
      const unavailableText = result.fallbackReply ?? CHATBOT_UNAVAILABLE_REPLY;

      void playChatbotReplyTone();
      setMessages((prev) => {
        const withUserLogId =
          result.logId != null
            ? prev.map((m) => (m.id === userMsg.id ? { ...m, logId: result.logId } : m))
            : prev;
        return withUserLogId
          .filter((m) => m.id !== pendingId)
          .concat({
            id: `f-${Date.now()}`,
            role: 'assistant',
            content: unavailableText,
            ctas: fallbackCtas,
            logId: result.logId,
            typing: true,
          });
      });
      notifyNewMessageIfClosed();
      return;
    }

    markCaptchaTrusted();
    setCaptchaTrusted(true);

    void playChatbotReplyTone();
    setMessages((prev) => {
      const withUserLogId =
        result.logId != null
          ? prev.map((m) => (m.id === userMsg.id ? { ...m, logId: result.logId } : m))
          : prev;
      return withUserLogId
        .filter((m) => m.id !== pendingId)
        .concat({
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: result.reply ?? '',
          ctas: result.ctas,
          logId: result.logId,
          isAiReply: true,
          typing: true,
        });
    });
    notifyNewMessageIfClosed();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId && m.id !== userMsg.id));
      if (!overrideText) setInput(text);
      setErrorHint('اتصال به سرور برقرار نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, sessionId, honeypot, captcha, showCaptcha, config, notifyNewMessageIfClosed, operatorActive, dismissVisitorIntro]);

  const handleRate = useCallback(
    async (messageId: string, logId: number, rating: number) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, rating } : m)));
      const res = await rateChatbotMessage({ sessionId, logId, rating });
      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, rating: undefined } : m)),
        );
        return;
      }
      track('chatbot_rating', { rating, session: sessionId });

      if (res.lowRating) {
        lowRatingFeedbackRef.current = { logId };
        setAwaitingLowRatingFeedback(true);
        void playChatbotReplyTone();
        notifyNewMessageIfClosed();
        setMessages((prev) =>
          prev.concat({
            id: `lr-ask-${Date.now()}`,
            role: 'assistant',
            content: LOW_RATING_FOLLOWUP,
            isAiReply: true,
            typing: true,
          }),
        );
      }
    },
    [sessionId, notifyNewMessageIfClosed],
  );

  const showQuickPrompts =
    tab === 'chat' &&
    chatEnabled &&
    !operatorActive &&
    !sending &&
    !chatInputLocked &&
    quickSuggestions.length > 0 &&
    messages.length === 1 &&
    messages[0]?.id === 'welcome';

  const sendQuickSuggestion = useCallback(
    (suggestion: ChatbotQuickSuggestion) => {
      if (sending || chatInputLocked) return;

      dismissVisitorIntro();

      if (showCaptcha) {
        setErrorHint('ابتدا کپچا را درست حل و تأیید کنید.');
        return;
      }

      setErrorHint(null);
      track('chatbot_message', { session: sessionId });

      void playChatbotReplyTone();
      setMessages((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          role: 'user',
          content: suggestion.label,
        },
        {
          id: `qs-${Date.now()}`,
          role: 'assistant',
          content: suggestion.response,
          typing: true,
        },
      ]);
    },
    [sending, chatInputLocked, showCaptcha, sessionId, dismissVisitorIntro],
  );

  const handleReplyModeSelect = useCallback((mode: ChatbotReplyMode) => {
    setPreferredReplyMode(mode);
    setHeaderModeOverride(mode);
    setReplyModeModalOpen(false);
    try {
      sessionStorage.setItem(REPLY_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    track('chatbot_reply_mode', { mode, session: sessionId });
  }, [sessionId]);

  const handleReplyModeSwitch = useCallback(
    (mode: ChatbotReplyMode) => {
      if (mode === 'ai' && operatorMode) return;
      setPreferredReplyMode(mode);
      setHeaderModeOverride(mode);
      setErrorHint(null);
      try {
        sessionStorage.setItem(REPLY_MODE_STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
      track('chatbot_reply_mode_switch', { mode, session: sessionId });
    },
    [operatorMode, sessionId],
  );

  const handlePhoneSaved = useCallback(
    (phone: string) => {
      markChatbotPhoneSaved(sessionId, phone);
      setSavedPhone(phone);
      setPhoneModalOpen(false);
      track('chatbot_phone_saved', { session: sessionId });
    },
    [sessionId],
  );

  const latestAiMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].isAiReply) return messages[i].id;
    }
    return null;
  }, [messages]);

  const lastReplyHeader = useMemo(
    () => headerFromLastReply(messages, config.assistant_name),
    [messages, config.assistant_name],
  );

  const chatHeaderPresentation = useMemo((): ChatHeaderPresentation => {
    const aiPresentation: ChatHeaderPresentation = {
      showsOperator: false,
      title: config.assistant_name,
      subtitle: TAB_META.chat.subtitle,
    };
    const genericOperatorPresentation: ChatHeaderPresentation = {
      showsOperator: true,
      title: lastReplyHeader.showsOperator ? lastReplyHeader.title : 'اپراتور بهرام',
      subtitle: 'پیام به اپراتور بهرام',
      avatarUrl: lastReplyHeader.showsOperator ? lastReplyHeader.avatarUrl : undefined,
    };

    if (headerModeOverride === 'ai' && !operatorMode) {
      return aiPresentation;
    }
    if (headerModeOverride === 'operator') {
      return lastReplyHeader.showsOperator ? lastReplyHeader : genericOperatorPresentation;
    }

    return lastReplyHeader;
  }, [
    headerModeOverride,
    lastReplyHeader,
    config.assistant_name,
    operatorMode,
  ]);

  function shouldOfferPhoneCta(msg: ChatbotMessage): boolean {
    return (
      !savedPhone &&
      msg.isAiReply === true &&
      msg.id === latestAiMessageId &&
      !msg.pending &&
      !msg.typing &&
      !msg.error &&
      !msg.fromOperator
    );
  }

  const tabs: AssistantTab[] = chatEnabled ? ['chat', 'contact', 'faq'] : ['contact', 'faq'];
  const headerMeta = TAB_META[tab];
  const headerShowsOperator = tab === 'chat' && chatEnabled && chatHeaderPresentation.showsOperator;
  const headerTitle =
    tab === 'chat' && chatEnabled ? chatHeaderPresentation.title : headerMeta.label;
  const headerSubtitle =
    tab === 'chat' && chatEnabled ? chatHeaderPresentation.subtitle : headerMeta.subtitle;
  const activeOperatorPresentation = chatHeaderPresentation.showsOperator
    ? { name: chatHeaderPresentation.title, avatarUrl: chatHeaderPresentation.avatarUrl }
    : null;
  const headerShowsOperatorStack =
    headerShowsOperator &&
    !activeOperatorPresentation?.avatarUrl &&
    chatHeaderPresentation.title === 'اپراتور بهرام';

  return (
    <div
      dir="ltr"
      className="pointer-events-none fixed bottom-[var(--site-fab-bottom)] left-0 right-0 z-[9999] flex justify-end px-4 lg:bottom-6 lg:px-6"
    >
      <div className="relative flex flex-col items-end">
        <div
          aria-hidden={!open}
          className={cn(
            'flex flex-col overflow-hidden border shadow-premium transition-all duration-300 ease-premium',
            'max-lg:fixed max-lg:inset-0 max-lg:z-[10000] max-lg:h-[100dvh] max-lg:w-full max-lg:max-w-none max-lg:rounded-none max-lg:border-0 max-lg:pt-[env(safe-area-inset-top,0px)] max-lg:pb-[env(safe-area-inset-bottom,0px)]',
            'lg:absolute lg:bottom-full lg:right-0 lg:mb-3 lg:h-[min(82vh,34rem)] lg:w-[min(100vw-2rem,22rem)] lg:rounded-lg xl:w-[24rem]',
            chatTheme.panel,
            open
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none invisible opacity-0 max-lg:translate-y-full max-lg:scale-100 lg:translate-y-4 lg:scale-95',
          )}
        >
          <ChatbotPhoneModal
            open={phoneModalOpen}
            onClose={() => setPhoneModalOpen(false)}
            sessionId={sessionId}
            onSaved={handlePhoneSaved}
          />
          <ChatbotReplyModeModal
            open={replyModeModalOpen}
            onClose={() => setReplyModeModalOpen(false)}
            onSelect={handleReplyModeSelect}
            aiAvailable={aiAvailable}
          />
          <div
            className={cn(
              'relative z-10 shrink-0 border-b px-3 py-2 sm:px-4',
              headerShowsOperator && tab === 'chat' && chatEnabled
                ? cn(
                    chatTheme.headerOperator,
                    dataTheme === 'dark' ? 'border-gold/10' : 'border-white/10',
                  )
                : cn(chatTheme.headerDefault, 'border-white/10'),
            )}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div
                className={cn(
                  'absolute -left-10 -top-10 h-28 w-28 rounded-full blur-2xl',
                  headerShowsOperator && dataTheme === 'dark' ? 'bg-gold/6' : 'bg-white/10',
                )}
              />
              <div
                className={cn(
                  'absolute -bottom-8 -right-6 h-24 w-24 rounded-full blur-2xl',
                  headerShowsOperator && dataTheme === 'dark' ? 'bg-gold/8' : 'bg-accent-bright/25',
                )}
              />
            </div>
            <div className="relative">
              <div className="flex min-h-12 items-center justify-between gap-2">
                <div className="flex shrink-0 items-center">
                  {showReplyModeSwitch && (
                    <ReplyModeSwitch
                      vertical
                      value={preferredReplyMode}
                      onChange={handleReplyModeSwitch}
                      aiDisabled={operatorMode}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 px-1 text-right" dir="rtl">
                  <p className="truncate text-[14px] font-bold leading-tight">{headerTitle}</p>
                  <div className="mt-0.5">
                    <p className="truncate text-[11px] leading-snug opacity-90">{headerSubtitle}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div
                    className={cn(
                      'relative shrink-0',
                      headerShowsOperator && tab === 'chat'
                        ? headerShowsOperatorStack
                          ? 'flex h-12 items-center justify-start'
                          : cn('h-12 w-12 overflow-hidden rounded-full', chatTheme.operatorAvatarRing)
                        : 'grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/25',
                    )}
                  >
                    {tab === 'chat' ? (
                      headerShowsOperator ? (
                        headerShowsOperatorStack ? (
                          <OperatorAvatarStack profiles={config.operator_profiles} ringClass={chatTheme.operatorAvatarRing} />
                        ) : (
                          <OperatorAvatar
                            name={activeOperatorPresentation?.name ?? 'اپراتور'}
                            avatarUrl={activeOperatorPresentation?.avatarUrl}
                            className="h-full w-full rounded-full"
                            iconClassName="h-[22px] w-[22px]"
                          />
                        )
                      ) : (
                        <Bot className="h-[22px] w-[22px]" />
                      )
                    ) : tab === 'contact' ? (
                      <Phone className="h-5 w-5" />
                    ) : (
                      <HelpCircle className="h-5 w-5" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition hover:bg-white/15 active:scale-95"
                    aria-label="بستن چت"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            data-lenis-prevent
            className={cn(
              'chatbot-scroll relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3',
              tab === 'chat' && chatEnabled ? cn('pb-1', chatTheme.thread) : cn('pb-2', chatTheme.tabBar),
            )}
            dir="rtl"
          >
            {tab === 'chat' && chatEnabled && (
              <div className="min-w-0 space-y-3">
                {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex min-w-0 w-full [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem]',
                        msg.role === 'user' ? 'justify-start' : 'justify-end',
                      )}
                      ref={(el) => {
                        if (el) messageDomRefs.current.set(msg.id, el);
                        else messageDomRefs.current.delete(msg.id);
                      }}
                    >
                      <div
                        className={cn(
                          'min-w-0 max-w-[85%] transition-shadow',
                          msg.role === 'user' &&
                            highlightMessageId === msg.id &&
                            'rounded-md ring-2 ring-accent/35',
                        )}
                      >
                        {msg.fromOperator && (
                          <p className={cn('mb-1 flex items-center justify-end gap-1.5 text-left text-[10px] font-semibold', chatTheme.operatorLabel)}>
                            <OperatorAvatar
                              name={msg.operatorName ?? 'اپراتور بهرام'}
                              avatarUrl={msg.operatorAvatarUrl}
                              className="h-4 w-4 shrink-0 rounded-full ring-1 ring-gold/40"
                              iconClassName="h-2.5 w-2.5"
                            />
                            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', chatTheme.operatorDot)} />
                            {msg.operatorName ?? 'اپراتور بهرام'}
                          </p>
                        )}
                        <div
                          className={cn(
                            'overflow-hidden rounded-md px-3 py-2 text-right text-[13px] leading-relaxed',
                            msg.role === 'user'
                              ? chatTheme.bubbleUser
                              : msg.error
                                ? chatTheme.bubbleError
                                : msg.fromOperator || msg.isOperatorAck
                                  ? chatTheme.bubbleOperator
                                  : chatTheme.bubbleBot,
                          )}
                          dir="rtl"
                        >
                          {msg.fromOperator && (() => {
                            const quoted = resolveReplyPreview(msg.replyToLogId, msg.replyToPreview);
                            if (!quoted) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.replyToLogId) {
                                    scrollToQuotedMessage(msg.replyToLogId, quoted);
                                  }
                                }}
                                className={cn(
                                  'mb-2 flex w-full items-start gap-1.5 rounded-md border px-2 py-1.5 text-right transition',
                                  chatTheme.operatorQuote,
                                  msg.replyToLogId ? 'cursor-pointer' : 'cursor-default',
                                )}
                              >
                                <Reply className={cn('mt-0.5 h-3 w-3 shrink-0 scale-x-[-1]', chatTheme.operatorQuoteIcon)} />
                                <span className={cn('line-clamp-2 text-[10px] leading-relaxed', chatTheme.operatorQuoteText)}>
                                  {quoted}
                                </span>
                              </button>
                            );
                          })()}
                          {msg.pending ? (
                            <ThinkingIndicator variant={operatorActive ? 'operator' : 'ai'} theme={dataTheme} />
                          ) : msg.typing ? (
                            <TypingText
                              text={msg.content}
                              onComplete={() => handleTypingComplete(msg.id)}
                              onProgress={handleTypingProgress}
                            />
                          ) : (
                            <div className="text-right" dir="rtl">
                              {msg.videoUrl ? <ChatbotMessageVideo src={msg.videoUrl} /> : null}
                              <ChatRichText text={msg.content} />
                            </div>
                          )}
                          {(() => {
                            if (msg.fromOperator || msg.isOperatorAck) return null;
                            const includePhone = shouldOfferPhoneCta(msg);
                            const base = (msg.ctas ?? []).filter(
                              (c) => c.type !== 'register_phone' || includePhone,
                            );
                            const ctas = withRegisterPhoneCta(base, { include: includePhone });
                            if (ctas.length === 0 || msg.pending || msg.typing) return null;
                            return (
                            <div className="mt-2.5 flex min-w-0 flex-col gap-1.5">
                              {ctas.map((cta) => {
                                if (cta.type === 'register_phone') {
                                  return (
                                    <button
                                      key={`${cta.label}-${cta.href}`}
                                      type="button"
                                      className={chatbotCtaButtonClass(chatTheme, cta.type)}
                                      onClick={() => {
                                        track('chatbot_cta', { type: cta.type });
                                        setPhoneModalOpen(true);
                                      }}
                                    >
                                      <CtaIcon type={cta.type} />
                                      {cta.label}
                                    </button>
                                  );
                                }
                                const href = ctaHref(cta);
                                const external = cta.type === 'whatsapp' || cta.type === 'phone';
                                const cls = chatbotCtaButtonClass(chatTheme, cta.type);
                                return external ? (
                                  <a
                                    key={`${cta.label}-${cta.href}`}
                                    href={href}
                                    className={cls}
                                    onClick={() => track('chatbot_cta', { type: cta.type })}
                                  >
                                    <CtaIcon type={cta.type} />
                                    {cta.label}
                                  </a>
                                ) : (
                                  <Link
                                    key={`${cta.label}-${cta.href}`}
                                    href={href}
                                    className={cls}
                                    onClick={() => track('chatbot_cta', { type: cta.type })}
                                  >
                                    <CtaIcon type={cta.type} />
                                    {cta.label}
                                  </Link>
                                );
                              })}
                            </div>
                            );
                          })()}
                        </div>
                        {msg.role === 'assistant' &&
                          msg.logId &&
                          !msg.pending &&
                          !msg.typing &&
                          !msg.error &&
                          !msg.isOperatorAck &&
                          msg.id !== 'welcome' &&
                          (msg.isAiReply === true || msg.fromOperator) && (
                            <ChatMessageRating
                              value={msg.rating}
                              prompt={msg.fromOperator ? 'پاسخ اپراتور چطور بود؟' : undefined}
                              onRate={(rating) => void handleRate(msg.id, msg.logId!, rating)}
                            />
                          )}
                      </div>
                    </div>
                  ))}

                {showQuickPrompts && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="pt-1"
                  >
                    <p className={cn('mb-2 text-[10px] font-medium', chatTheme.muted)}>پیشنهاد سریع:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickSuggestions.map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => sendQuickSuggestion(prompt)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-[11px] font-medium transition active:scale-[0.98]',
                            chatTheme.quickChip,
                          )}
                        >
                          {prompt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {tab === 'contact' && (
              <div className="flex min-w-0 flex-col gap-2">
                <p className={cn('mb-1 text-[12px] leading-relaxed', chatTheme.muted)}>
                  برای سوال درباره دوره‌ها، سات یا درخواست دسترسی یکی از راه‌های زیر را انتخاب کنید:
                </p>
                {config.ctas.whatsapp && (
                <a
                  href={`https://wa.me/${siteConfig.contact.whatsappRaw}`}
                  onClick={() => track('whatsapp_click', { from: 'assistant' })}
                  className={chatbotCtaButtonClass(chatTheme, 'whatsapp', true)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/15 text-success transition group-hover:scale-105">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>واتساپ</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>پاسخ سریع در واتساپ</span>
                  </span>
                </a>
                )}
                <a
                  href={siteConfig.social.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={chatbotCtaButtonClass(chatTheme, 'link', true)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-400 transition group-hover:scale-105">
                    <Send className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>تلگرام پشتیبانی</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>{siteConfig.social.telegramHandle}</span>
                  </span>
                </a>
                <a
                  href={siteConfig.social.rubika}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={chatbotCtaButtonClass(chatTheme, 'link', true)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-300 transition group-hover:scale-105">
                    <Radio className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>روبیکا پشتیبانی</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>{siteConfig.social.rubikaHandle}</span>
                  </span>
                </a>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={chatbotCtaButtonClass(chatTheme, 'link', true)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink-500/15 text-pink-300 transition group-hover:scale-105">
                    <Instagram className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>اینستاگرام</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>{siteConfig.social.instagramHandle}</span>
                  </span>
                </a>
                {config.ctas.phone && (
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  onClick={() => track('call_click', { from: 'assistant' })}
                  className={chatbotCtaButtonClass(chatTheme, 'phone', true)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald/10 text-emerald transition group-hover:scale-105">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>تماس تلفنی</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>{siteConfig.contact.phone}</span>
                  </span>
                </a>
                )}
                {config.ctas.pricing && (
                  <Link href="/courses" className={chatbotCtaButtonClass(chatTheme, 'pricing', true)}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald/15 text-emerald transition group-hover:scale-105">
                      <Tag className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className={cn('block text-[13px] font-bold', chatTheme.body)}>مشاهده دوره‌ها</span>
                      <span className={cn('text-[10px]', chatTheme.muted)}>لیست دوره‌ها و کمپین‌نویسی</span>
                    </span>
                  </Link>
                )}
                <Link href="/contact" className={chatbotCtaButtonClass(chatTheme, 'link', true)}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald/10 text-emerald transition group-hover:scale-105">
                    <MessagesSquare className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>فرم تماس</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>ارسال پیام از سایت</span>
                  </span>
                </Link>
                <Link href="/saat" className={chatbotCtaButtonClass(chatTheme, 'link', true)}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald/10 text-emerald transition group-hover:scale-105">
                    <Bot className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className={cn('block text-[13px] font-bold', chatTheme.body)}>سات</span>
                    <span className={cn('text-[10px]', chatTheme.muted)}>هر تماس، یک فرصت فروش</span>
                  </span>
                </Link>
              </div>
            )}

            {tab === 'faq' && (
              <div className="min-w-0 space-y-4">
                {faqLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className={cn('h-5 w-5 animate-spin', chatTheme.spinner)} />
                  </div>
                ) : faqGroups.length > 0 ? (
                  <>
                    {faqGroups.map((group) => (
                      <section key={group.id} className="min-w-0 space-y-1.5">
                        <h3 className={cn('px-0.5 text-[11px]', chatTheme.sectionTitle)}>{group.title}</h3>
                        <FaqAccordion items={group.items} compact variant="site" />
                      </section>
                    ))}
                    <Link
                      href="/faq"
                      className={cn('block pt-1 text-center text-[11px]', chatTheme.accentLink)}
                    >
                      مشاهده همه سوالات →
                    </Link>
                  </>
                ) : (
                  <p className={cn('py-6 text-center text-[12px]', chatTheme.muted)}>سوالی ثبت نشده است.</p>
                )}
              </div>
            )}
          </div>

          <div className={cn(CHAT_DOCK, chatTheme.dock)} dir="rtl">
          {tab === 'chat' && chatEnabled && (
          <div className="relative px-3 pb-2 pt-2.5">
            <input
              type="text"
              id={honeypotId}
              name="company_website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
            />
            <AnimatePresence mode="wait" initial={false}>
              {showCaptcha ? (
                <motion.div
                  key="captcha-step"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-2.5"
                >
                  {showVisitorIntro && (
                    <ChatbotVisitorIntro
                      firstName={visitorFirstName}
                      lastName={visitorLastName}
                      onFirstNameChange={setVisitorFirstName}
                      onLastNameChange={setVisitorLastName}
                      compact
                    />
                  )}
                  <p className={cn('text-center text-[11px] font-medium', chatTheme.muted)}>
                    برای شروع گفتگو، تأیید امنیتی را انجام دهید
                  </p>
                  {errorHint && (
                    <div className={cn('flex items-start gap-2 rounded-md border px-3 py-2', chatTheme.errorHint)}>
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p className="text-[11px] leading-relaxed">{errorHint}</p>
                    </div>
                  )}
                  <div className={cn('rounded-[22px] p-2.5', chatTheme.composer)}>
                    <CaptchaField
                      ref={captchaFieldRef}
                      key={captcha.resetKey}
                      {...captcha.fieldProps}
                      siteKey={config.captcha.site_key}
                      variant="site"
                      compact
                      inline
                      onHumanVerified={handleHumanVerified}
                      onMathSubmit={handleCaptchaSubmit}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCaptchaSubmit()}
                    disabled={verifyingCaptcha || !captcha.fieldReady}
                    className="w-full rounded-full bg-gradient-ai px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {verifyingCaptcha ? (
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال بررسی…
                      </span>
                    ) : (
                      'ادامه و شروع گفتگو'
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="composer-step"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {!showCaptcha && showVisitorIntro && (
                    <div className="mb-2">
                      <ChatbotVisitorIntro
                        firstName={visitorFirstName}
                        lastName={visitorLastName}
                        onFirstNameChange={setVisitorFirstName}
                        onLastNameChange={setVisitorLastName}
                        compact
                      />
                    </div>
                  )}
                  <ChatMessageComposer
                    value={input}
                    onChange={setInput}
                    onSend={() => void send()}
                    sending={sending}
                    disabled={sending}
                    autoFocus
                    theme={dataTheme}
                    placeholder={
                      awaitingLowRatingFeedback
                        ? 'مشکل یا انتظار خود را بنویسید…'
                        : operatorActive
                          ? 'پیام به اپراتور…'
                          : 'پیام…'
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          <div className="relative px-2.5 pb-2.5 pt-1.5">
            <div className={cn('relative overflow-hidden rounded-[14px] p-1', chatTheme.composer)}>
              <div className="relative flex rounded-[10px] bg-bone/5 p-0.5">
            {tabs.map((t) => {
              const active = tab === t;
              const Icon = t === 'chat' ? Bot : t === 'contact' ? Phone : HelpCircle;
              return (
                <span key={t} className="contents">
                  <button
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(TAB_ITEM_BASE, active ? chatTheme.tabActive : chatTheme.tabIdle)}
                  >
                    <Icon className={cn('h-4 w-4', active && chatTheme.tabIconActive)} />
                    {t === 'chat' ? 'چت' : t === 'contact' ? 'تماس' : 'سوالات'}
                  </button>
                </span>
              );
            })}
              </div>
            </div>
          </div>
          </div>
        </div>

        <ChatbotFloatingLauncher
          assistantName={config.assistant_name ?? ''}
          open={open}
          chatTheme={chatTheme}
          hasNewMessage={hasNewMessage}
          onOpen={() => setOpen(true)}
          onToggle={() => setOpen((v) => !v)}
        />
      </div>
    </div>
  );
}
