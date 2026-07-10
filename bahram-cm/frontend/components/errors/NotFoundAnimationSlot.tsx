'use client';

import dynamic from 'next/dynamic';

export const NotFoundAnimationSlot = dynamic(
  () => import('./NotFoundAnimation').then((m) => m.NotFoundAnimation),
  {
    ssr: false,
    loading: () => <div className="mx-auto mb-2 h-56 w-full max-w-[20rem] sm:h-64" aria-hidden />,
  },
);
