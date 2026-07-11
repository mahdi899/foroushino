'use client';

import { useId, useRef, useState } from 'react';
import { CaptchaField, useCaptchaGate, type CaptchaFieldHandle } from '@/components/captcha/CaptchaField';
import { isFormProtected, type CaptchaPayload, type FormSecurityTarget } from '@/lib/captcha/types';

export type FormSecurityPayload = {
  captcha: CaptchaPayload | null;
  website?: string;
};

export function useFormSecurity(
  target: FormSecurityTarget,
  options?: {
    captchaTight?: boolean;
    captchaStacked?: boolean;
    captchaBand?: boolean;
    captchaAdmin?: boolean;
    /** false = full-width block layout for multi-field forms (default true for inline rows). */
    captchaInline?: boolean;
  },
) {
  const captchaGate = useCaptchaGate();
  const captchaRef = useRef<CaptchaFieldHandle>(null);
  const honeypotId = useId();
  const [honeypot, setHoneypot] = useState('');

  const configLoaded = !captchaGate.loading;
  const captchaRequired = configLoaded && isFormProtected(captchaGate.config, target);
  const honeypotEnabled = captchaGate.config?.honeypot_enabled ?? true;
  const captchaReady = configLoaded && (!captchaRequired || captchaGate.fieldReady);
  const securityLoading = !configLoaded;
  const admin = options?.captchaAdmin ?? false;
  const stacked = options?.captchaStacked ?? false;
  const band = options?.captchaBand ?? false;
  const inline = options?.captchaInline ?? true;

  const getSecurityPayload = (): FormSecurityPayload => {
    const captcha =
      captchaRequired
        ? captchaGate.fieldPayload ?? captchaRef.current?.getPayload() ?? null
        : null;
    return {
      captcha,
      website: honeypotEnabled ? honeypot : undefined,
    };
  };

  const honeypotField = honeypotEnabled ? (
    <input
      id={honeypotId}
      name="website"
      type="text"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      value={honeypot}
      onChange={(e) => setHoneypot(e.target.value)}
      className="absolute start-[-9999px] top-auto h-px w-px overflow-hidden opacity-0"
    />
  ) : null;

  const captchaField = captchaRequired ? (
    <CaptchaField
      ref={captchaRef}
      key={captchaGate.resetKey}
      active={configLoaded}
      siteKey={admin ? '' : captchaGate.siteKey}
      variant={admin ? 'admin' : 'site'}
      compact
      inline={inline}
      tight={!admin && !band && (stacked || !!options?.captchaTight)}
      pillEmbed={!admin && !stacked && !!options?.captchaTight}
      className={admin || stacked || !inline ? 'w-full min-w-0' : options?.captchaTight ? 'shrink-0' : undefined}
      {...captchaGate.fieldProps}
    />
  ) : null;

  return {
    captchaField,
    honeypotField,
    captchaRequired,
    captchaReady,
    securityLoading,
    getSecurityPayload,
    resetCaptcha: captchaGate.reset,
  };
}

/** @deprecated Use useFormSecurity */
export function useFormCaptcha(target: FormSecurityTarget = 'leads') {
  const security = useFormSecurity(target);
  return {
    captchaField: security.captchaField,
    captchaReady: security.captchaReady,
    getCaptchaPayload: () => security.getSecurityPayload().captcha,
    honeypotField: security.honeypotField,
    getSecurityPayload: security.getSecurityPayload,
    captchaRequired: security.captchaRequired,
    securityLoading: security.securityLoading,
  };
}
