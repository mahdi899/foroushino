'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  BookOpen,
  Hand,
  Heart,
  Laugh,
  Loader2,
  MessageCircle,
  Smile,
  Sparkles,
  Star,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react';
import { CHAT_TEXT_FONT, QUICK_EMOJIS } from '@/lib/chatbot/emojiFont';
import { chatbotThemeClasses } from '@/lib/chatbot/themeClasses';
import type { DataTheme } from '@/lib/useDataTheme';
import { cn } from '@/lib/utils';

const MIN_HEIGHT_PX = 36;
const MAX_HEIGHT_PX = 88;
const EMOJI_PANEL_Z = 10001;

const QUICK_EMOJI_ICON: Record<
  string,
  { Icon: LucideIcon; className: string; filled?: boolean }
> = {
  '😊': { Icon: Smile, className: 'text-amber-500' },
  '🙂': { Icon: Smile, className: 'text-amber-400' },
  '😁': { Icon: Laugh, className: 'text-amber-500' },
  '🙏': { Icon: Hand, className: 'text-gold' },
  '❤️': { Icon: Heart, className: 'text-red-500', filled: true },
  '👍': { Icon: ThumbsUp, className: 'text-emerald' },
  '📚': { Icon: BookOpen, className: 'text-gold' },
  '✨': { Icon: Sparkles, className: 'text-gold' },
  '💚': { Icon: Heart, className: 'text-emerald', filled: true },
  '⭐': { Icon: Star, className: 'text-gold', filled: true },
  '👋': { Icon: Hand, className: 'text-amber-500' },
  '💬': { Icon: MessageCircle, className: 'text-emerald' },
};

interface PanelPosition {
  left: number;
  width: number;
  bottom: number;
}

interface ChatMessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  locked?: boolean;
  sending?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  theme?: DataTheme;
}

export function ChatMessageComposer({
  value,
  onChange,
  onSend,
  disabled,
  locked,
  sending,
  placeholder = 'پیام…',
  autoFocus,
  theme = 'dark',
}: ChatMessageComposerProps) {
  const chatTheme = useMemo(() => chatbotThemeClasses(theme), [theme]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${MIN_HEIGHT_PX}px`;
    const next = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, []);

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPanelPos({
      left: rect.left,
      width: rect.width,
      bottom: window.innerHeight - rect.top + 8,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useEffect(() => {
    if (!autoFocus || locked || disabled) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [autoFocus, locked, disabled]);

  useEffect(() => {
    if (!emojiOpen) return;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [emojiOpen, updatePanelPosition]);

  useEffect(() => {
    if (!emojiOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (emojiBtnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setEmojiOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [emojiOpen]);

  const insertAtCursor = useCallback(
    (emoji: string) => {
      const el = textareaRef.current;
      if (!el || locked || disabled) return;
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + emoji + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [disabled, locked, onChange, value],
  );

  const inputDisabled = disabled || locked;
  const canSend = !sending && !!value.trim() && !locked;

  const toggleEmojiPanel = useCallback(() => {
    if (disabled || locked) return;
    setEmojiOpen((open) => {
      const next = !open;
      if (next) requestAnimationFrame(updatePanelPosition);
      return next;
    });
  }, [disabled, locked, updatePanelPosition]);

  const emojiPanel =
    mounted && emojiOpen && panelPos
      ? createPortal(
          <AnimatePresence>
            <motion.div
              ref={panelRef}
              key="emoji-panel"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                left: panelPos.left,
                width: panelPos.width,
                bottom: panelPos.bottom,
                zIndex: EMOJI_PANEL_Z,
              }}
              className={cn('overflow-hidden rounded-[20px]', chatTheme.composerPanel)}
              dir="ltr"
              role="toolbar"
              aria-label="ایموجی سریع"
            >
              <div className="relative px-2 pb-2 pt-1.5">
                <div className="grid grid-cols-6 gap-1">
                  {QUICK_EMOJIS.map((emoji) => {
                    const visual = QUICK_EMOJI_ICON[emoji.char] ?? {
                      Icon: Smile,
                      className: 'text-amber-500',
                    };
                    const { Icon, className, filled } = visual;
                    return (
                      <button
                        key={emoji.char}
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => insertAtCursor(emoji.char)}
                        className={cn(
                          'grid h-10 w-full place-items-center rounded-xl transition active:scale-90',
                          chatTheme.composerEmojiCell,
                        )}
                        aria-label={`افزودن ${emoji.label}`}
                      >
                        <Icon
                          className={cn('h-[18px] w-[18px]', className, filled && 'fill-current')}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      {emojiPanel}
      <div ref={anchorRef} className="relative">
        <div
          dir="rtl"
          className={cn(
            'relative flex w-full items-end gap-1 overflow-hidden rounded-[22px] px-1.5 py-1',
            chatTheme.composerInput,
            inputDisabled && 'opacity-60',
          )}
        >
          <button
            ref={emojiBtnRef}
            type="button"
            onClick={toggleEmojiPanel}
            disabled={inputDisabled}
            title={emojiOpen ? 'بستن ایموجی' : 'ایموجی'}
            className={cn(
              'mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition disabled:opacity-40',
              chatTheme.composerEmojiBtn,
              emojiOpen && chatTheme.composerEmojiBtnActive,
            )}
            aria-label={emojiOpen ? 'بستن ایموجی' : 'افزودن ایموجی'}
            aria-expanded={emojiOpen}
            aria-pressed={emojiOpen}
          >
            <Smile className={cn('h-[18px] w-[18px]', emojiOpen ? 'text-emerald' : chatTheme.composerToolbarIcon)} strokeWidth={1.75} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onInput={syncHeight}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) {
                  setEmojiOpen(false);
                  onSend();
                }
              }
              if (e.key === 'Escape') setEmojiOpen(false);
            }}
            placeholder={placeholder}
            disabled={inputDisabled}
            readOnly={locked}
            aria-disabled={locked}
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            spellCheck
            className={cn(
              'block max-h-[88px] min-h-[36px] min-w-0 flex-1 resize-none bg-transparent px-0.5 py-2 text-[15px] leading-[1.35] text-bone outline-none ring-0',
              chatTheme.composerPlaceholder,
              'focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-mist',
            )}
            style={{ height: MIN_HEIGHT_PX, fontFamily: CHAT_TEXT_FONT }}
          />

          <button
            type="button"
            onClick={() => {
              setEmojiOpen(false);
              onSend();
            }}
            disabled={!canSend}
            className={cn(
              'mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all',
              canSend ? chatTheme.composerSendActive : cn('cursor-default', chatTheme.composerSendIdle),
            )}
            aria-label="ارسال"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" strokeWidth={2} />
            ) : (
              <ArrowUp
                className={cn('h-[17px] w-[17px]', canSend ? 'text-white' : chatTheme.composerToolbarIcon)}
                strokeWidth={2.25}
                aria-hidden
              />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
