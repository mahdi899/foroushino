import 'package:flutter/foundation.dart';

/// Default super-admin for the Bahram admin panel, Family web, and this manager app.
/// Created via `php artisan app:create-admin` — OTP exempt on the backend.
class BootstrapAdmin {
  BootstrapAdmin._();

  static const name = 'Mehdi Akbari Joghal';
  static const email = 'shokspy@gmail.com';
  static const password = 'NacP#i3Wqt9edhJlvgkj';
  static const mobile = '09367018089';
  static const role = 'super-admin';
  static const otpExempt = true;
  static const isRootAdmin = true;

  /// Prefill login fields in debug builds only.
  static ({String email, String password})? get devDefaults {
    if (!kDebugMode) return null;
    return (email: email, password: password);
  }
}
