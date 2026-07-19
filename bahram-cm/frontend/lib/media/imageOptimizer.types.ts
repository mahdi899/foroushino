/** Image optimizer settings (TinyPNG + reSmush.it). */

export const OPTIMIZER_QUALITY_OPTIONS = [60, 70, 75, 80, 85, 90, 95, 100] as const;

/** @deprecated Use OPTIMIZER_QUALITY_OPTIONS */
export const RESMUSH_QUALITY_OPTIONS = OPTIMIZER_QUALITY_OPTIONS;

export type OptimizerQuality = (typeof OPTIMIZER_QUALITY_OPTIONS)[number];

/** @deprecated Use OptimizerQuality */
export type ResmushQuality = OptimizerQuality;

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
  resmushQuality: OptimizerQuality;
  resmushReferer: string;
};

export function normalizeOptimizerQuality(value: unknown): OptimizerQuality {
  const n = Number(value);
  if (!Number.isFinite(n)) return 95;
  if ((OPTIMIZER_QUALITY_OPTIONS as readonly number[]).includes(n)) {
    return n as OptimizerQuality;
  }
  return OPTIMIZER_QUALITY_OPTIONS.reduce((best, option) =>
    Math.abs(option - n) < Math.abs(best - n) ? option : best,
  );
}

/** @deprecated Use normalizeOptimizerQuality */
export function normalizeResmushQuality(value: unknown): OptimizerQuality {
  return normalizeOptimizerQuality(value);
}

export const DEFAULT_IMAGE_OPTIMIZER_FORM: ImageOptimizerForm = {
  tinifyKeyInput: '',
  resmushEnabled: true,
  resmushQuality: 95,
  resmushReferer: '',
};

export function imageOptimizerViewToForm(view: ImageOptimizerView): ImageOptimizerForm {
  return {
    tinifyKeyInput: '',
    resmushEnabled: view.resmush_enabled,
    resmushQuality: normalizeOptimizerQuality(view.resmush_quality),
    resmushReferer: view.resmush_referer ?? '',
  };
}
