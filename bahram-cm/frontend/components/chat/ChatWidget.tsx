"use client";

import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStudentFormPrefill } from "@/components/student-panel/auth/StudentAuthContext";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import {
  getChatbotSettings,
  sendChatbotMessage,
  type ChatbotSettings,
} from "@/lib/services/chatbot";

type ChatMessage = { role: "user" | "bot"; text: string };

const SESSION_KEY = "bcm_chat_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Floating chatbot widget wired to the Laravel `/api/chatbot/*` endpoints.
 * Renders nothing until settings are fetched and `is_enabled` is true, so it
 * never flashes on pages before the admin has turned the chatbot on.
 */
export function ChatWidget() {
  const prefill = useStudentFormPrefill();
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.name) setName(prefill.name);
    if (prefill.phone) setPhone(prefill.phone);
  }, [prefill]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    let mounted = true;
    getChatbotSettings().then((result) => {
      if (mounted && result.ok) setSettings(result.data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function toggleOpen() {
    setOpen((wasOpen) => {
      if (!wasOpen) track("chatbot_open", {});
      return !wasOpen;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    setError(null);
    track("chatbot_message_sent", { session_id: sessionIdRef.current });

    const result = await sendChatbotMessage({
      session_id: sessionIdRef.current,
      message: text,
      name: (prefill?.name || name).trim() || undefined,
      phone: (prefill?.phone || phone).trim() || undefined,
    });

    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessages((m) => [...m, { role: "bot", text: result.data.reply }]);
  }

  if (!settings?.is_enabled) return null;

  return (
    <div className="fixed bottom-5 end-5 z-50 md:bottom-7 md:end-7">
      {open ? (
        <div className="mb-4 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-card border border-bone/12 bg-charcoal/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-bone/10 px-4 py-3">
            <p className="text-body font-semibold text-bone">
              {settings.bot_name || "دستیار هوشمند"}
            </p>
            <button
              type="button"
              onClick={toggleOpen}
              aria-label="بستن گفتگو"
              className="text-mist hover:text-bone"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {settings.collect_name_enabled || settings.collect_phone_enabled ? (
            prefill ? null : (
            <div className="flex gap-2 border-b border-bone/10 px-4 py-2.5">
              {settings.collect_name_enabled ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="نام (اختیاری)"
                  className="h-8 min-w-0 flex-1 rounded-pill border border-bone/12 bg-ink/60 px-3 text-xs text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none"
                />
              ) : null}
              {settings.collect_phone_enabled ? (
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="شماره (اختیاری)"
                  dir="ltr"
                  className="h-8 min-w-0 flex-1 rounded-pill border border-bone/12 bg-ink/60 px-3 text-xs text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none"
                />
              ) : null}
            </div>
            )
          ) : null}

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {settings.welcome_message ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-tile bg-bone/8 px-3.5 py-2.5 text-sm leading-relaxed text-bone-dim">
                  {settings.welcome_message}
                </div>
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-tile px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "bg-emerald/15 text-bone" : "bg-bone/8 text-bone-dim",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-end">
                <div className="rounded-tile bg-bone/8 px-3.5 py-2.5 text-bone-dim">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                </div>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-caption text-gold">
                {error}
              </p>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-bone/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="پیامت را بنویس…"
              className="h-10 min-w-0 flex-1 rounded-pill border border-bone/12 bg-ink/60 px-4 text-sm text-bone placeholder:text-mist focus:border-emerald/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="ارسال"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-emerald text-bone transition-colors hover:bg-emerald-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="rtl-flip h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        aria-label={open ? "بستن چت" : "باز کردن چت"}
        className="neon-btn-primary flex h-14 w-14 items-center justify-center rounded-full bg-emerald shadow-xl transition-transform hover:-translate-y-0.5 hover:bg-emerald-glow"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
      </button>
    </div>
  );
}
