"use client";

import { useServerInsertedHTML } from "next/navigation";

type ServerInsertedJsonLdProps = {
  id: string;
  data: unknown;
};

/**
 * Injects JSON-LD during the server HTML stream only (React 19 safe).
 * Avoids rendering <script> in the client React tree, which Next 16 warns about.
 */
export function ServerInsertedJsonLd({ id, data }: ServerInsertedJsonLdProps) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");

  useServerInsertedHTML(() => (
    <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: payload }} />
  ));

  return null;
}
