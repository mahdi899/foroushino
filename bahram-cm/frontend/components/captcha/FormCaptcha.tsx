'use client';

import { useId, useRef, useState } from 'react';
import { CaptchaField, useCaptchaGate, type CaptchaFieldHandle } from '@/components/captcha/CaptchaField';
import { isFormProtected, type CaptchaPayload, type FormSecurityTarget } from '@/lib/captcha/types';

export type FormSecurityPayload = {
  captcha: CaptchaPayload | null;
  website?: string;
};

export function useFormSecurity(target: FormSecurityTarget, options?: { captchaTight?: boolean }) {
  const captchaGate = useCaptchaGate();
  const captchaRef = useRef<CaptchaFieldHandle>(null);
  const honeypotId = useId();
  const [honeypot, setHoneypot] = useState('');

  const captchaRequired = isFormProtected(captchaGate.config, target);
  const honeypotEnabled = captchaGate.config?.honeypot_enabled ?? true;
  const captchaReady = !captchaRequired || captchaGate.fieldReady;
  const securityLoading = captchaGate.loading;

  const getSecurityPayload = (): FormSecurityPayload => ({
    captcha: captchaRequired ? captchaRef.current?.getPayload() ?? null : null,
    website: honeypotEnabled ? honeypot : undefined,
  });

  const honeypotField = honeypotEnabled ? (
    <input
      id={honeypotId}
      name="website"
      type="text"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      value={honeypot}
      onChange={(e) => setHoneypot(e.target.value)}
      className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
    />
  ) : null;

  const captchaField = captchaRequired ? (
    <CaptchaField
      ref={captchaRef}
      key={captchaGate.resetKey}
      active={!captchaGate.loading}
      siteKey={captchaGate.siteKey}
      variant="site"
      compact
      inline
      tight={options?.captchaTight}
      pillEmbed={options?.captchaTight}
      className={options?.captchaTight ? 'shrink-0' : undefined}
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
