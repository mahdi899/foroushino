"use client";

import { Share2 } from "lucide-react";
import { useCallback, useState } from "react";

type InsightShareButtonProps = {
  title: string;
  text?: string | null;
  url?: string;
};

function buildSharePayloads(title: string, text: string, url: string): ShareData[] {
  const payloads: ShareData[] = [{ title, text, url }, { title, url }, { url }];
  return payloads;
}

async function openNativeShare(data: ShareData): Promise<"shared" | "aborted" | "unsupported"> {
  if (typeof navigator.share !== "function" || !window.isSecureContext) {
    return "unsupported";
  }

  if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
    return "unsupported";
  }

  try {
    await navigator.share(data);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "aborted";
    }
    return "unsupported";
  }
}

export function InsightShareButton({ title, text, url }: InsightShareButtonProps) {
  const [label, setLabel] = useState("اشتراک");

  const handleShare = useCallback(async () => {
    const shareUrl = url ?? window.location.href;
    const shareText = text?.trim() || title;
    const payloads = buildSharePayloads(title, shareText, shareUrl);

    for (const payload of payloads) {
      const result = await openNativeShare(payload);
      if (result === "shared" || result === "aborted") return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setLabel("کپی شد");
      window.setTimeout(() => setLabel("اشتراک"), 2000);
    } catch {
      setLabel("خطا");
      window.setTimeout(() => setLabel("اشتراک"), 2000);
    }
  }, [title, text, url]);

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="insight-hero-split__share"
      aria-label="اشتراک‌گذاری مقاله"
    >
      <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
