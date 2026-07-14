'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { FamilyMediaBlock } from '@/lib/family/types';

export function ImageBlock({ media }: { media: FamilyMediaBlock }) {
  const [open, setOpen] = useState(false);

  if (!media.url) {
    return <div className="aspect-square w-full rounded-2xl bg-white/5" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full overflow-hidden rounded-2xl bg-white/5"
        style={media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : { aspectRatio: '1' }}
      >
        <Image src={media.url} alt="" fill unoptimized className="object-cover" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
        >
          <img src={media.url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

export function ImageAlbumBlock({ items }: { items: FamilyMediaBlock[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => (
        <ImageBlock key={item.id} media={item} />
      ))}
    </div>
  );
}
