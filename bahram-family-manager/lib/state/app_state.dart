import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/api/api_client.dart';
import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/services/auth_service.dart';
import 'package:bahram_family_manager/services/family_manager_service.dart';
import 'package:bahram_family_manager/services/secure_storage.dart';

/// Top-level app state: session lifecycle + shared service instances.
/// Screen-local data (post lists, comment tabs, etc.) lives in the screens
/// themselves via simple FutureBuilder/refresh patterns to keep this class
/// small and avoid a god-object.
class AppState extends ChangeNotifier {
  /// All three collaborators must share a single [ApiClient] instance — it's
  /// what carries the bearer token interceptor and the 401 callback below.
  AppState({SecureStorage? storage}) : _storage = storage ?? SecureStorage() {
    _api = ApiClient();
    _auth = AuthService(api: _api, storage: _storage);
    manager = FamilyManagerService(api: _api);
    _api.onUnauthorized = _handleUnauthorized;
  }

  final SecureStorage _storage;
  late final ApiClient _api;
  late final AuthService _auth;
  late final FamilyManagerService manager;

  ManagerUser? user;
  bool bootstrapping = true;
  String? sessionError;
  ThemeMode themeMode = ThemeMode.system;

  Future<void> bootstrap() async {
    bootstrapping = true;
    notifyListeners();
    try {
      await _loadThemePreference();
      final restored = await _auth.restoreSession();
      if (restored != null) {
        // Re-validate against the server in case the token was revoked.
        user = await _auth.fetchMe();
      }
    } catch (_) {
      user = null;
    } finally {
      bootstrapping = false;
      notifyListeners();
    }
  }

  Future<bool> isAdminLoginProtected() => _auth.isAdminLoginProtected();

  Future<MathChallenge> fetchMathChallenge() => _auth.fetchMathChallenge();

  Future<({String mobile, String masked})> requestOtp({
    required String email,
    required String password,
    String? captchaId,
    String? captchaAnswer,
  }) {
    return _auth.loginWithPassword(
      email: email,
      password: password,
      captchaId: captchaId,
      captchaAnswer: captchaAnswer,
    );
  }

  Future<void> resendOtp(String mobile) => _auth.resendOtp(mobile);

  Future<void> verifyOtp({required String mobile, required String code}) async {
    user = await _auth.verifyOtp(mobile: mobile, code: code);
    notifyListeners();
  }

  Future<void> logout() async {
    await _auth.logout();
    user = null;
    notifyListeners();
  }

  void _handleUnauthorized() {
    if (user == null) return;
    user = null;
    sessionError = 'نشست شما منقضی شده؛ دوباره وارد شوید.';
    notifyListeners();
  }

  void clearSessionError() {
    sessionError = null;
  }

  Future<void> _loadThemePreference() async {
    final saved = await _storage.readThemeMode();
    if (saved == null) return;
    themeMode = switch (saved) {
      'dark' => ThemeMode.dark,
      'light' => ThemeMode.light,
      _ => ThemeMode.system,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    await _storage.writeThemeMode(mode.name);
    notifyListeners();
  }

  Future<void> toggleTheme(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark);
  }
}

/// Thrown/caught locally in screens to show ApiException messages consistently.
String messageOf(Object error) => error is ApiException ? error.message : 'خطای ناشناخته رخ داد.';
