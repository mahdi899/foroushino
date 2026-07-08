export type SmsSpotplayerCredentialsForm = {
  melipayamakUsername: string;
  melipayamakPasswordInput: string;
  melipayamakSenderNumber: string;
  melipayamakActive: boolean;
  kavenegarApiKeyInput: string;
  kavenegarSenderNumber: string;
  kavenegarActive: boolean;
  spotplayerApiKeyInput: string;
  spotplayerBaseUrl: string;
  spotplayerActive: boolean;
  spotplayerDefaultLicenseDuration: string;
};

export type SmsProviderCredentialsView = {
  slug: string;
  label_fa: string;
  sender_number: string | null;
  is_active: boolean;
  configured: boolean;
  has_credentials: boolean;
  credential_hint: string | null;
};

export type SmsSpotplayerCredentialsView = {
  melipayamak_username: string | null;
  has_melipayamak_password: boolean;
  melipayamak_configured: boolean;
  has_spotplayer_api_key: boolean;
  spotplayer_api_key_preview: string | null;
  spotplayer_configured: boolean;
  spotplayer_base_url: string | null;
  is_spotplayer_active: boolean;
  default_license_duration: number | null;
  providers: SmsProviderCredentialsView[];
};

export const DEFAULT_SMS_SPOTPLAYER_CREDENTIALS_FORM: SmsSpotplayerCredentialsForm = {
  melipayamakUsername: '',
  melipayamakPasswordInput: '',
  melipayamakSenderNumber: '',
  melipayamakActive: false,
  kavenegarApiKeyInput: '',
  kavenegarSenderNumber: '',
  kavenegarActive: false,
  spotplayerApiKeyInput: '',
  spotplayerBaseUrl: '',
  spotplayerActive: false,
  spotplayerDefaultLicenseDuration: '',
};

export function credentialsViewToForm(view: SmsSpotplayerCredentialsView): SmsSpotplayerCredentialsForm {
  const melipayamak = view.providers.find((p) => p.slug === 'melipayamak');
  const kavenegar = view.providers.find((p) => p.slug === 'kavenegar');

  return {
    melipayamakUsername: view.melipayamak_username ?? '',
    melipayamakPasswordInput: '',
    melipayamakSenderNumber: melipayamak?.sender_number ?? '',
    melipayamakActive: melipayamak?.is_active ?? false,
    kavenegarApiKeyInput: '',
    kavenegarSenderNumber: kavenegar?.sender_number ?? '',
    kavenegarActive: kavenegar?.is_active ?? false,
    spotplayerApiKeyInput: '',
    spotplayerBaseUrl: view.spotplayer_base_url ?? '',
    spotplayerActive: view.is_spotplayer_active ?? false,
    spotplayerDefaultLicenseDuration:
      view.default_license_duration != null ? String(view.default_license_duration) : '',
  };
}
