import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import sharp from 'sharp';
import { ImageResponse } from 'next/og';
import { siteStorageMedia } from '@/config/media';

export const SITE_FAVICON_SRC = siteStorageMedia('logo-bahram.webp');

export const SITE_FAVICON_OBJECT_FIT = 'cover' as const;
export const SITE_FAVICON_OBJECT_POSITION = '50% 50%';

const logoPath = path.join(
  process.cwd(),
  '../backend/storage/app/public/media/site/logo-bahram.webp',
);

const loadLogoDataUrl = cache(async (): Promise<string> => {
  const bytes = await fs.readFile(logoPath);
  const png = await sharp(bytes).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
});

export async function renderSiteFavicon(size: number): Promise<ImageResponse> {
  const src = await loadLogoDataUrl();
  const padding = Math.max(2, Math.round(size * 0.04));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f10',
        }}
      >
        <div
          style={{
            width: size - padding * 2,
            height: size - padding * 2,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: '50%',
          }}
        >
          <img
            src={src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: SITE_FAVICON_OBJECT_FIT,
              objectPosition: SITE_FAVICON_OBJECT_POSITION,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
