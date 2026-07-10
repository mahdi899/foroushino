import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import sharp from 'sharp';
import { ImageResponse } from 'next/og';
import { siteStorageMedia } from '@/config/media';

export const SITE_FAVICON_SRC = siteStorageMedia('portrait-founder.webp');

/** Matches the founder portrait crop on the homepage hero block. */
export const SITE_FAVICON_OBJECT_POSITION = '50% 18%';

const portraitPath = path.join(
  process.cwd(),
  '../backend/storage/app/public/media/site/portrait-founder.webp',
);

const loadPortraitDataUrl = cache(async (): Promise<string> => {
  const bytes = await fs.readFile(portraitPath);
  const png = await sharp(bytes).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
});

export async function renderSiteFavicon(size: number): Promise<ImageResponse> {
  const src = await loadPortraitDataUrl();
  const radius = Math.round(size * 0.22);
  const border = Math.max(1, Math.round(size * 0.04));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1517',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
            borderRadius: radius,
            border: `${border}px solid rgba(234, 251, 251, 0.12)`,
          }}
        >
          <img
            src={src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: SITE_FAVICON_OBJECT_POSITION,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
