"use client";

import { useSyncExternalStore } from "react";

/** No-op — client snapshot is constant; we only need server vs client. */
const subscribe = () => () => {};

/**
 * Inline boot scripts for the document head.
 * Emit only during SSR + matching hydration; return null afterwards so
 * React 19 / Next 16 does not warn about client-created `<script>` tags
 * (those never execute). Avoid useServerInsertedHTML in a client boundary
 * (Turbopack "module factory is not available" on soft navigations / family).
 */
export function SiteBootScripts({
  themeHtml,
  devCleanupHtml = null,
}: {
  themeHtml: string;
  devCleanupHtml?: string | null;
}) {
  const isServerOrHydration = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );

  if (!isServerOrHydration) {
    return null;
  }

  return (
    <>
      <script
        id="site-theme-boot"
        dangerouslySetInnerHTML={{ __html: themeHtml }}
      />
      {devCleanupHtml ? (
        <script
          id="bahram-dev-sw-cleanup"
          dangerouslySetInnerHTML={{ __html: devCleanupHtml }}
        />
      ) : null}
    </>
  );
}
