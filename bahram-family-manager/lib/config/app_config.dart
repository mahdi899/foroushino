/// Runtime configuration — override via `--dart-define` at build time, e.g.:
/// flutter run --dart-define=API_BASE_URL=https://fashio.ir/api/v1
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // 10.0.2.2 is the Android emulator's alias for the host machine's localhost.
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  static const String appName = 'مدیر خانواده بهرام';
}
