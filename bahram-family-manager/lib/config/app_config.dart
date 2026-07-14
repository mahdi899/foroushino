import 'package:flutter/foundation.dart';

/// Runtime configuration — override via `--dart-define` at build time, e.g.:
/// flutter run --dart-define=API_BASE_URL=https://fashio.ir/api/v1
class AppConfig {
  AppConfig._();

  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    // Web/desktop hit the host machine directly; Android emulator uses 10.0.2.2.
    if (kIsWeb) return 'http://127.0.0.1:8010/api/v1';
    return 'http://10.0.2.2:8010/api/v1';
  }

  static const String appName = 'مدیر خانواده بهرام';
}
