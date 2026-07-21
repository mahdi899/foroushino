/**
 * Inline boot scripts for the document head — Server Component only.
 * Do NOT use useServerInsertedHTML in a client boundary (Turbopack
 * "module factory is not available" on soft navigations / family routes).
 */
export function SiteBootScripts({
  themeHtml,
  devCleanupHtml = null,
}: {
  themeHtml: string;
  devCleanupHtml?: string | null;
}) {
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
