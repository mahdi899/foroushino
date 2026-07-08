'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AdminPage } from '../ui';
import { useAdminSaveBar } from '../AdminSaveBarContext';
import { siteConfig } from '@/config/site';
import {
  getSiteSettings,
  loadCacheIntegrationsSettings,
  loadCaptchaSettings,
  loadImageOptimizerSettingsPanel,
  loadSmsRoutingConfig,
  loadTrackingSettings,
  persistCacheIntegrationsSettings,
  persistCaptchaSettings,
  persistImageOptimizerSettings,
  persistTrackingSettings,
  saveSiteSettings,
} from './actions';
import { CaptchaSettingsSection } from './CaptchaSettingsSection';
import { CacheIntegrationsSettingsSection } from './CacheIntegrationsSettingsSection';
import { ImageOptimizerSettingsSection } from './ImageOptimizerSettingsSection';
import { GoogleTrackingSettingsSection } from './GoogleTrackingSettingsSection';
import { BlogCategoriesManager } from '../blog/BlogCategoriesManager';
import { DEFAULT_CAPTCHA_FORM, type CaptchaSettingsForm } from '@/lib/captcha/types';
import { DEFAULT_TRACKING_FORM, type TrackingSettingsForm } from '@/lib/tracking/types';
import {
  DEFAULT_CACHE_INTEGRATIONS_FORM,
  type CacheIntegrationsForm,
  type CacheIntegrationsView,
} from '@/lib/cache/integrations.types';
import { testCacheIntegrationAction } from '@/lib/cache/integrations';
import { testImageOptimizerAction } from '@/lib/media/imageOptimizer';
import {
  DEFAULT_IMAGE_OPTIMIZER_FORM,
  type ImageOptimizerForm,
  type ImageOptimizerView,
} from '@/lib/media/imageOptimizer.types';
import {
  loadSmsSpotplayerCredentialsSettings,
  saveSmsSpotplayerCredentialsSettingsAction,
  testSmsSpotplayerCredentialsAction,
} from '@/lib/admin/smsSpotplayerCredentials';
import {
  credentialsViewToForm,
  DEFAULT_SMS_SPOTPLAYER_CREDENTIALS_FORM,
  type SmsSpotplayerCredentialsForm,
  type SmsSpotplayerCredentialsView,
} from '@/lib/admin/smsSpotplayerCredentials.types';
import { SmsSpotplayerCredentialsSettingsSection } from './SmsSpotplayerCredentialsSettingsSection';
import { SmsRoutingSettingsSection } from './SmsRoutingSettingsSection';
import type { SmsCenterConfig } from '@/lib/admin/smsCenter.types';

export default function SettingsPage() {
  const [data, setData] = useState({
    phone: siteConfig.contact.phone,
    whatsapp: siteConfig.contact.whatsapp,
    email: siteConfig.contact.email,
    address: siteConfig.location.address,
    mapUrl: siteConfig.location.mapUrl,
  });
  const [captchaForm, setCaptchaForm] = useState<CaptchaSettingsForm>(DEFAULT_CAPTCHA_FORM);
  const [captchaMeta, setCaptchaMeta] = useState({
    hasSecretKey: false,
    secretKeyPreview: null as string | null,
    envFallback: { siteKey: false, secretKey: false },
  });
  const [trackingForm, setTrackingForm] = useState<TrackingSettingsForm>(DEFAULT_TRACKING_FORM);
  const [trackingMeta, setTrackingMeta] = useState({
    hasGa4ServiceAccount: false,
    ga4ServiceAccountEmail: null as string | null,
    hasIndexNowKey: false,
    indexNowKeyPreview: null as string | null,
    envFallback: { ga4Property: false, ga4ServiceAccount: false, verification: false, indexNow: false },
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [integrationsForm, setIntegrationsForm] = useState<CacheIntegrationsForm>(DEFAULT_CACHE_INTEGRATIONS_FORM);
  const [integrationsView, setIntegrationsView] = useState<CacheIntegrationsView | null>(null);
  const [integrationsTesting, setIntegrationsTesting] = useState<'webhook' | 'cloudflare' | null>(null);
  const [imageOptimizerForm, setImageOptimizerForm] = useState<ImageOptimizerForm>(DEFAULT_IMAGE_OPTIMIZER_FORM);
  const [imageOptimizerView, setImageOptimizerView] = useState<ImageOptimizerView | null>(null);
  const [imageOptimizerTesting, setImageOptimizerTesting] = useState<'tinify' | 'resmush' | null>(null);
  const [imageOptimizerSaving, setImageOptimizerSaving] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState<SmsSpotplayerCredentialsForm>(
    DEFAULT_SMS_SPOTPLAYER_CREDENTIALS_FORM,
  );
  const [credentialsView, setCredentialsView] = useState<SmsSpotplayerCredentialsView | null>(null);
  const [credentialsTesting, setCredentialsTesting] = useState<'melipayamak' | 'kavenegar' | 'spotplayer' | null>(null);
  const [smsRoutingConfig, setSmsRoutingConfig] = useState<SmsCenterConfig | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const baselineRef = useRef('');

  const settingsSnapshot = useMemo(
    () =>
      JSON.stringify({
        data,
        captchaForm,
        trackingForm,
        integrationsForm,
        imageOptimizerForm,
        credentialsForm,
      }),
    [data, captchaForm, trackingForm, integrationsForm, imageOptimizerForm, credentialsForm],
  );

  const isDirty = hydrated && settingsSnapshot !== baselineRef.current;

  useEffect(() => {
    void Promise.all([
      getSiteSettings(),
      loadCaptchaSettings(),
      loadTrackingSettings(),
      loadCacheIntegrationsSettings(),
      loadImageOptimizerSettingsPanel(),
      loadSmsSpotplayerCredentialsSettings(),
      loadSmsRoutingConfig(),
    ])
      .then(([site, captcha, tracking, integrations, imageOptimizer, credentials, smsRouting]) => {
        const loadedData = {
          phone: siteConfig.contact.phone,
          whatsapp: siteConfig.contact.whatsapp,
          email: siteConfig.contact.email,
          address: siteConfig.location.address,
          mapUrl: siteConfig.location.mapUrl,
          ...(site && Object.keys(site).length ? site : {}),
        };
        setData(loadedData);
        setCaptchaForm(captcha.form);
        setCaptchaMeta({
          hasSecretKey: captcha.meta.hasSecretKey,
          secretKeyPreview: captcha.meta.secretKeyPreview,
          envFallback: captcha.meta.envFallback,
        });
        setTrackingForm(tracking.form);
        setTrackingMeta({
          hasGa4ServiceAccount: tracking.meta.hasGa4ServiceAccount,
          ga4ServiceAccountEmail: tracking.meta.ga4ServiceAccountEmail,
          hasIndexNowKey: tracking.meta.hasIndexNowKey,
          indexNowKeyPreview: tracking.meta.indexNowKeyPreview,
          envFallback: tracking.meta.envFallback,
        });
        setIntegrationsForm(integrations.form);
        setIntegrationsView(integrations.view);
        setImageOptimizerForm(imageOptimizer.form);
        setImageOptimizerView(imageOptimizer.view);
        const credentialsFormLoaded = credentials ? credentialsViewToForm(credentials) : DEFAULT_SMS_SPOTPLAYER_CREDENTIALS_FORM;
        setCredentialsForm(credentialsFormLoaded);
        setCredentialsView(credentials);
        setSmsRoutingConfig(smsRouting);
        baselineRef.current = JSON.stringify({
          data: loadedData,
          captchaForm: captcha.form,
          trackingForm: tracking.form,
          integrationsForm: integrations.form,
          imageOptimizerForm: imageOptimizer.form,
          credentialsForm: credentialsFormLoaded,
        });
        setHydrated(true);
      })
      .catch(() => {});
  }, []);

  async function saveCaptchaOnly(): Promise<{ ok: boolean; error?: string }> {
    const res = await persistCaptchaSettings(captchaForm);
    if (res.ok) {
      const { form, meta } = await loadCaptchaSettings();
      setCaptchaForm(form);
      setCaptchaMeta({
        hasSecretKey: meta.hasSecretKey,
        secretKeyPreview: meta.secretKeyPreview,
        envFallback: meta.envFallback,
      });
    }
    return res;
  }

  async function saveTrackingOnly(): Promise<{ ok: boolean; error?: string }> {
    const res = await persistTrackingSettings(trackingForm);
    if (res.ok) {
      const { form, meta } = await loadTrackingSettings();
      setTrackingForm(form);
      setTrackingMeta({
        hasGa4ServiceAccount: meta.hasGa4ServiceAccount,
        ga4ServiceAccountEmail: meta.ga4ServiceAccountEmail,
        hasIndexNowKey: meta.hasIndexNowKey,
        indexNowKeyPreview: meta.indexNowKeyPreview,
        envFallback: meta.envFallback,
      });
    }
    return res;
  }

  async function saveIntegrationsOnly(): Promise<{ ok: boolean; error?: string }> {
    const res = await persistCacheIntegrationsSettings(integrationsForm);
    if (res.ok) {
      const { form, view } = await loadCacheIntegrationsSettings();
      setIntegrationsForm(form);
      setIntegrationsView(view);
    }
    return res;
  }

  async function saveCredentialsOnly(): Promise<{ ok: boolean; error?: string }> {
    const res = await saveSmsSpotplayerCredentialsSettingsAction(credentialsForm);
    if (res.ok && res.data) {
      setCredentialsView(res.data);
      setCredentialsForm(credentialsViewToForm(res.data));
    }
    return res;
  }

  async function handleTestCredentials(target: 'melipayamak' | 'kavenegar' | 'spotplayer') {
    setCredentialsTesting(target);
    setStatusMessage('');
    const saveRes = await saveCredentialsOnly();
    if (!saveRes.ok) {
      setCredentialsTesting(null);
      setStatus('error');
      setStatusMessage(saveRes.error ?? 'ذخیره کلیدها قبل از تست ناموفق بود.');
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 4000);
      return;
    }
    const res = await testSmsSpotplayerCredentialsAction(target);
    setCredentialsTesting(null);
    setStatusMessage(res.message);
    setStatus(res.ok ? 'saved' : 'error');
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 4000);
  }

  async function saveImageOptimizerOnly(): Promise<{ ok: boolean; error?: string }> {
    const res = await persistImageOptimizerSettings(imageOptimizerForm);
    if (res.ok) {
      const { form, view } = await loadImageOptimizerSettingsPanel();
      setImageOptimizerForm(form);
      setImageOptimizerView(view);
    }
    return res;
  }

  async function handleSaveImageOptimizerSection() {
    setImageOptimizerSaving(true);
    setStatusMessage('');
    const res = await saveImageOptimizerOnly();
    setImageOptimizerSaving(false);
    if (res.ok) {
      setStatus('saved');
      setStatusMessage('تنظیمات بهینه‌سازی تصویر ذخیره شد.');
    } else {
      setStatus('error');
      setStatusMessage(res.error ?? 'ذخیره تنظیمات بهینه‌سازی تصویر ناموفق بود.');
    }
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 2800);
  }

  async function handleTestIntegration(target: 'webhook' | 'cloudflare') {
    setIntegrationsTesting(target);
    setStatusMessage('');
    const res = await testCacheIntegrationAction(target);
    setIntegrationsTesting(null);
    setStatusMessage(res.message);
    setStatus(res.ok ? 'saved' : 'error');
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 4000);
  }

  async function handleTestImageOptimizer(target: 'tinify' | 'resmush') {
    setImageOptimizerTesting(target);
    setStatusMessage('');
    const res = await testImageOptimizerAction(target);
    setImageOptimizerTesting(null);
    setStatusMessage(res.message);
    setStatus(res.ok ? 'saved' : 'error');
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 4000);
  }

  async function save() {
    setStatus('loading');
    setStatusMessage('');
    const [siteRes, captchaRes, trackingRes, integrationsRes, imageOptimizerRes, credentialsRes] = await Promise.all([
      saveSiteSettings(data),
      saveCaptchaOnly(),
      saveTrackingOnly(),
      saveIntegrationsOnly(),
      saveImageOptimizerOnly(),
      saveCredentialsOnly(),
    ]);
    if (siteRes.ok && captchaRes.ok && trackingRes.ok && integrationsRes.ok && imageOptimizerRes.ok && credentialsRes.ok) {
      setStatus('saved');
      setStatusMessage('تنظیمات ذخیره شد.');
    } else if (!credentialsRes.ok) {
      setStatus('error');
      setStatusMessage(credentialsRes.error ?? 'ذخیره کلیدهای ملی‌پیامک/SpotPlayer ناموفق بود.');
    } else if (!imageOptimizerRes.ok) {
      setStatus('error');
      setStatusMessage(imageOptimizerRes.error ?? 'ذخیره تنظیمات بهینه‌سازی تصویر ناموفق بود.');
    } else if (!integrationsRes.ok) {
      setStatus('error');
      setStatusMessage(integrationsRes.error ?? 'ذخیره تنظیمات Webhook/Cloudflare ناموفق بود.');
    } else if (!trackingRes.ok) {
      setStatus('error');
      setStatusMessage(trackingRes.error ?? 'ذخیره تنظیمات گوگل ناموفق بود.');
    } else if (!captchaRes.ok) {
      setStatus('error');
      setStatusMessage(captchaRes.error ?? 'ذخیره تنظیمات کپچا ناموفق بود.');
    } else {
      setStatus('error');
      setStatusMessage('ذخیره اطلاعات تماس ناموفق بود.');
    }
    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 2800);
  }

  useEffect(() => {
    if (status === 'saved') {
      baselineRef.current = settingsSnapshot;
    }
  }, [status, settingsSnapshot]);

  useAdminSaveBar({
    dirty: isDirty,
    onSave: save,
    saving: status === 'loading',
    label: 'ذخیره تغییرات',
    message: status !== 'idle' && status !== 'loading' ? statusMessage : undefined,
    messageTone: status === 'error' ? 'error' : 'success',
  });

  function field(key: keyof typeof data, label: string, dir?: string) {
    return (
      <div>
        <label className="field-label">{label}</label>
        <input
          value={String(data[key])}
          onChange={(e) => setData({ ...data, [key]: e.target.value })}
          className="field-input"
          dir={dir}
        />
      </div>
    );
  }

  return (
    <AdminPage
      title="تنظیمات سایت"
      desc="اطلاعات تماس، کپچا، بهینه‌سازی، کلیدهای API، مسیردهی پیامک و SpotPlayer"
      action={
        <div className="flex flex-col items-end gap-1">
          <button onClick={save} className="btn btn-primary px-4 py-2 text-small">
            {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {status === 'saved' ? 'ذخیره شد' : 'ذخیره'}
          </button>
          {statusMessage && (
            <p className={`text-caption ${status === 'error' ? 'text-error' : 'text-success'}`}>{statusMessage}</p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="card p-6">
          <h2 className="mb-4 text-h3 text-primary-dark">اطلاعات تماس</h2>
          <p className="mb-4 text-caption text-text-muted">
            در چت‌بات، فوتر و صفحات تماس استفاده می‌شود.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('phone', 'تلفن')}
            {field('whatsapp', 'واتساپ')}
            {field('email', 'ایمیل', 'ltr')}
            {field('address', 'آدرس')}
            {field('mapUrl', 'لینک نقشه', 'ltr')}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-1 text-h3 text-primary-dark">دسته‌بندی insights</h2>
          <p className="mb-4 text-caption text-text-muted">
            دسته‌های مقالات — در ویرایشگر مقاله هم از «مدیریت دسته‌ها» قابل دسترسی است.
          </p>
          <BlogCategoriesManager />
        </div>

        <GoogleTrackingSettingsSection
          form={trackingForm}
          hasGa4ServiceAccount={trackingMeta.hasGa4ServiceAccount}
          ga4ServiceAccountEmail={trackingMeta.ga4ServiceAccountEmail}
          hasIndexNowKey={trackingMeta.hasIndexNowKey}
          indexNowKeyPreview={trackingMeta.indexNowKeyPreview}
          envFallback={trackingMeta.envFallback}
          onChange={setTrackingForm}
        />

        <CaptchaSettingsSection
          form={captchaForm}
          hasSecretKey={captchaMeta.hasSecretKey}
          secretKeyPreview={captchaMeta.secretKeyPreview}
          envFallback={captchaMeta.envFallback}
          onChange={setCaptchaForm}
        />

        <ImageOptimizerSettingsSection
          form={imageOptimizerForm}
          view={imageOptimizerView}
          testing={imageOptimizerTesting}
          saving={imageOptimizerSaving}
          onChange={setImageOptimizerForm}
          onSave={() => void handleSaveImageOptimizerSection()}
          onTest={(target) => void handleTestImageOptimizer(target)}
        />

        <CacheIntegrationsSettingsSection
          form={integrationsForm}
          view={integrationsView}
          testing={integrationsTesting}
          onChange={setIntegrationsForm}
          onTest={(target) => void handleTestIntegration(target)}
        />

        <SmsSpotplayerCredentialsSettingsSection
          form={credentialsForm}
          view={credentialsView}
          testing={credentialsTesting}
          onChange={setCredentialsForm}
          onTest={(target) => void handleTestCredentials(target)}
        />

        {smsRoutingConfig ? (
          <SmsRoutingSettingsSection global={smsRoutingConfig.global} providers={smsRoutingConfig.providers} />
        ) : (
          <div id="sms-routing" className="card p-6 text-caption text-text-muted">
            بارگذاری تنظیمات مسیردهی پیامک ناموفق بود. سرور لاراول را بررسی کنید.
          </div>
        )}
      </div>
    </AdminPage>
  );
}
