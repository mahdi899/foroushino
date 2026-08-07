import { NextResponse } from 'next/server';
import twaAssetLinks from '@/data/twa-asset-links.json';
import {
  buildAssetLinksEntries,
  parseSha256Fingerprints,
  TWA_ANDROID_PACKAGE_ID,
} from '@/lib/twa/asset-links';

function resolveFingerprints(): string[] {
  const fromEnv = parseSha256Fingerprints(process.env.TWA_ANDROID_SHA256_FINGERPRINTS);
  if (fromEnv.length > 0) return fromEnv;

  const fromFile = Array.isArray(twaAssetLinks.fingerprints)
    ? twaAssetLinks.fingerprints.map((value) => String(value))
    : [];

  return fromFile;
}

/**
 * Android Digital Asset Links for Trusted Web Activity verification.
 * Must be served at `/.well-known/assetlinks.json` on rostami.club.
 */
export function GET() {
  const packageId = process.env.TWA_ANDROID_PACKAGE_ID?.trim() || twaAssetLinks.packageId || TWA_ANDROID_PACKAGE_ID;
  const fingerprints = resolveFingerprints();
  const payload = buildAssetLinksEntries(fingerprints).map((entry) => ({
    ...entry,
    target: {
      ...entry.target,
      package_name: packageId,
    },
  }));

  return NextResponse.json(payload, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
