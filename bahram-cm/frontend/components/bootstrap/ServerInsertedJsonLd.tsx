type ServerInsertedJsonLdProps = {
  id: string;
  data: unknown;
};

/**
 * JSON-LD for Server Components only — no client bundle.
 * Avoids Turbopack/SSR "module factory is not available" issues from
 * useServerInsertedHTML inside a client boundary.
 */
export function ServerInsertedJsonLd({ id, data }: ServerInsertedJsonLdProps) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: payload }} />
  );
}
