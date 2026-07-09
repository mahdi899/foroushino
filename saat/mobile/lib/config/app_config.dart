/// Runtime configuration — override via `--dart-define`.
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  static const String appName = 'سات';
  static const String tagline = 'هر تماس، یک فرصت فروش';

  /// VoIP will plug in here later (WebRTC / SIP).
  static const bool voipEnabled = false;
}
