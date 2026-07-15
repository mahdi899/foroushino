import 'package:flutter/foundation.dart';

import 'package:bahram_family_manager/config/dev_ports.dart';

/// Runtime configuration — override via `--dart-define` at build time, e.g.:
/// flutter run --dart-define=API_BASE_URL=https://fashio.ir/api/v1
class AppConfig {
  AppConfig._();

  static String get apiBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;

    if (kIsWeb) return DevPorts.webApiBaseUrl;
    if (defaultTargetPlatform == TargetPlatform.android) {
      return DevPorts.androidApiBaseUrl;
    }
    return DevPorts.desktopApiBaseUrl;
  }

  static const String appName = 'مدیر خانواده بهرام';

  /// آدرس ثابت اپ وب در توسعه (همان پورت 7357).
  static String get webDevUrl => DevPorts.appUrl;
}
