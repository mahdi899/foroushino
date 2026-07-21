'use client';

import { useRef } from 'react';
import { useServerInsertedHTML } from 'next/navigation';

/**
 * Injects blocking boot scripts into the SSR HTML stream without leaving
 * `<script>` nodes in the client React tree.
 *
 * Raw `<script>` in `app/layout.tsx` <head> triggers React 19's
 * "Encountered a script tag while rendering React component" on soft
 * navigations (e.g. /family → site), because the root layout RSC re-emits
 * those nodes and the client reconciles them.
 */
export function ServerInsertedBootScripts({
  themeHtml,
  devCleanupHtml = null,
}: {
  themeHtml: string;
  devCleanupHtml?: string | null;
}) {
  const done = useRef(false);

  useServerInsertedHTML(() => {
    // One insert per full document SSR. Soft-nav RSC passes remount this
    // component with a fresh ref on the server request — still fine: the
    // client never renders these as React script elements.
    if (done.current) return null;
    done.current = true;

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
  });

  return null;
}
