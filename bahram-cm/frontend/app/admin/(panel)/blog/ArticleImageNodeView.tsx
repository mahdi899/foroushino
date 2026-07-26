'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { resolveMediaUrl } from '@/lib/mediaUrl';

export function ArticleImageNodeView({ node, selected }: NodeViewProps) {
  const portable = (node.attrs.src as string | null) ?? '';
  const displaySrc = resolveMediaUrl(portable) || portable;

  return (
    <NodeViewWrapper
      as="div"
      className={`my-4 block ${selected ? 'rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={(node.attrs.alt as string | undefined) ?? ''}
        width={node.attrs.width ?? undefined}
        height={node.attrs.height ?? undefined}
        className="h-auto max-w-full rounded-lg"
        loading="lazy"
        decoding="async"
      />
    </NodeViewWrapper>
  );
}
