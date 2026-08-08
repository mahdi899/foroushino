/** Digital Asset Links fingerprints for the Club TWA (club.rostami.family). */
export const TWA_ANDROID_PACKAGE_ID =
  process.env.TWA_ANDROID_PACKAGE_ID?.trim() || 'club.rostami.family';

export type AssetLinksEntry = {
  relation: string[];
  target: {
    namespace: 'android_app';
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export function parseSha256Fingerprints(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,\s]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

export function buildAssetLinksEntries(fingerprints: string[]): AssetLinksEntry[] {
  const normalized = fingerprints
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (normalized.length === 0) return [];

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: TWA_ANDROID_PACKAGE_ID,
        sha256_cert_fingerprints: normalized,
      },
    },
  ];
}
