export interface TrackingStoredConfig {
  analytics_enabled: boolean;
  ga4_measurement_id: string;
  gtm_container_id: string;
  ga4_dashboard_enabled?: boolean;
  ga4_property_id?: string;
  ga4_service_account_json?: string;
  search_console_enabled: boolean;
  site_verification_code: string;
  indexnow_key?: string;
}

export interface TrackingPublicConfig {
  analytics: {
    provider: 'cloudflare' | 'inline';
    enabled: boolean;
    ga4_id: string;
    gtm_id: string;
    configured: boolean;
  };
  search_console: {
    enabled: boolean;
    verification_code: string;
    configured: boolean;
  };
  indexnow: {
    configured: boolean;
    key: string;
  };
}

export interface TrackingConfigAdminView {
  ga4DashboardEnabled: boolean;
  ga4PropertyId: string;
  hasGa4ServiceAccount: boolean;
  ga4ServiceAccountEmail: string | null;
  searchConsoleEnabled: boolean;
  siteVerificationCode: string;
  hasIndexNowKey: boolean;
  indexNowKeyPreview: string | null;
  envFallback: {
    ga4Property: boolean;
    ga4ServiceAccount: boolean;
    verification: boolean;
    indexNow: boolean;
  };
}

export interface TrackingSettingsForm {
  ga4DashboardEnabled: boolean;
  ga4PropertyId: string;
  ga4ServiceAccountJsonInput: string;
  searchConsoleEnabled: boolean;
  siteVerificationCode: string;
  indexNowKeyInput: string;
}

export const DEFAULT_TRACKING_FORM: TrackingSettingsForm = {
  ga4DashboardEnabled: false,
  ga4PropertyId: '',
  ga4ServiceAccountJsonInput: '',
  searchConsoleEnabled: false,
  siteVerificationCode: '',
  indexNowKeyInput: '',
};

export const EMPTY_TRACKING_PUBLIC: TrackingPublicConfig = {
  analytics: { provider: 'cloudflare', enabled: false, ga4_id: '', gtm_id: '', configured: false },
  search_console: { enabled: false, verification_code: '', configured: false },
  indexnow: { configured: false, key: '' },
};
