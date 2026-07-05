"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires a single `content_view` event when a detail page mounts. */
export function ContentViewTracker({
  type,
  slug,
}: {
  type: string;
  slug: string;
}) {
  useEffect(() => {
    track("content_view", { type, slug });
  }, [type, slug]);

  return null;
}
