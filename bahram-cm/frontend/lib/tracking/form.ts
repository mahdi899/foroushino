import type { TrackingConfigAdminView, TrackingSettingsForm } from './types';

export function adminViewToTrackingForm(view: TrackingConfigAdminView): TrackingSettingsForm {
  return {
    ga4DashboardEnabled: view.ga4DashboardEnabled,
    ga4PropertyId: view.ga4PropertyId,
    ga4ServiceAccountJsonInput: '',
    searchConsoleEnabled: view.searchConsoleEnabled,
    siteVerificationCode: view.siteVerificationCode,
    indexNowKeyInput: '',
  };
}
