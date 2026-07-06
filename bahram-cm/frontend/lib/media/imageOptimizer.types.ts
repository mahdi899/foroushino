/** Image optimizer settings (TinyPNG + reSmush.it). */

export const RESMUSH_QUALITY_OPTIONS = [60, 70, 75, 80, 85, 90, 95, 100] as const;

export type ResmushQuality = (typeof RESMUSH_QUALITY_OPTIONS)[number];

export type ImageOptimizerEnvFallback = {
  tinify_key: boolean;
  resmush_referer: boolean;
};

export type ImageOptimizerView = {
  has_tinify_key: boolean;
  tinify_key_preview: string | null;
  tinify_configured: boolean;
  resmush_enabled: boolean;
  resmush_quality: number;
  resmush_referer: string;
  resmush_configured: boolean;
  env_fallback: ImageOptimizerEnvFallback;
};

export type ImageOptimizerForm = {
  tinifyKeyInput: string;
  resmushEnabled: boolean;
  resmushQuality: ResmushQuality;
  resmushReferer: string;
};

export function normalizeResmushQuality(value: unknown): ResmushQuality {
  const n = Number(value);
  if (!Number.isFinite(n)) return 85;
  if ((RESMUSH_QUALITY_OPTIONS as readonly number[]).includes(n)) {
    return n as ResmushQuality;
  }
  return RESMUSH_QUALITY_OPTIONS.reduce((best, option) =>
    Math.abs(option - n) < Math.abs(best - n) ? option : best,
  );
}

export const DEFAULT_IMAGE_OPTIMIZER_FORM: ImageOptimizerForm = {
  tinifyKeyInput: '',
  resmushEnabled: true,
  resmushQuality: 85,
  resmushReferer: '',
};

export function imageOptimizerViewToForm(view: ImageOptimizerView): ImageOptimizerForm {
  return {
    tinifyKeyInput: '',
    resmushEnabled: view.resmush_enabled,
    resmushQuality: normalizeResmushQuality(view.resmush_quality),
    resmushReferer: view.resmush_referer ?? '',
  };
}
