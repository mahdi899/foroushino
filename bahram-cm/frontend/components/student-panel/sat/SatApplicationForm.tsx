'use client';

import { useActionState } from 'react';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';
import { submitSatApplicationAction } from '@/lib/student/panelActions';
import type { SimpleFormState } from '@/lib/student/panelFormUtils';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';

const INITIAL: SimpleFormState = {};

export function SatApplicationForm({
  mobile,
  defaultFirstName = '',
  defaultLastName = '',
}: {
  mobile: string;
  defaultFirstName?: string;
  defaultLastName?: string;
}) {
  const [state, action] = useActionState(submitSatApplicationAction, INITIAL);
  const { captchaField, honeypotField, captchaRequired, captchaReady, securityLoading, getSecurityPayload } =
    useFormSecurity('leads', { captchaInline: false });

  usePanelFormFeedback(state, {
    successTitle: 'درخواست ثبت شد',
    errorTitle: 'ثبت ناموفق',
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const { captcha, website } = getSecurityPayload();
    if (captchaRequired && !captcha) {
      event.preventDefault();
      return;
    }

    const form = event.currentTarget;
    const setHidden = (name: string, value: string) => {
      let input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    };

    if (captcha?.captcha_token) setHidden('captcha_token', captcha.captcha_token);
    if (captcha?.captcha_provider) setHidden('captcha_provider', captcha.captcha_provider);
    if (captcha?.captcha_id) setHidden('captcha_id', captcha.captcha_id);
    if (captcha?.captcha_answer !== undefined) setHidden('captcha_answer', String(captcha.captcha_answer));
    if (website !== undefined) setHidden('website', website);
  };

  return (
    <form action={action} onSubmit={onSubmit} className="panel-form-grid">
      {honeypotField}
      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="first_name">نام</label>
        <input
          id="first_name"
          name="first_name"
          className="field-input"
          defaultValue={defaultFirstName}
          required
        />
      </div>
      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="last_name">نام خانوادگی</label>
        <input
          id="last_name"
          name="last_name"
          className="field-input"
          defaultValue={defaultLastName}
          required
        />
      </div>
      <div>
        <label className="field-label">شماره موبایل</label>
        <input value={mobile} disabled className="field-input" dir="ltr" />
      </div>
      <div>
        <label className="field-label" htmlFor="city">شهر</label>
        <input id="city" name="city" className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="age">سن</label>
        <input id="age" name="age" type="number" min={10} max={120} className="field-input" />
      </div>
      <div className="panel-form-grid__full">{captchaField}</div>
      <button
        type="submit"
        disabled={securityLoading || !captchaReady}
        className="btn btn-primary panel-form-grid__full"
      >
        ثبت درخواست
      </button>
    </form>
  );
}
