import 'dart:convert';

import 'package:bahram_family_manager/core/api/api_client.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/services/secure_storage.dart';

/// Reuses the existing admin login flow (email/password → SMS OTP → Sanctum
/// token) — no parallel auth system. See backend `AuthController`.
class AuthService {
  AuthService({ApiClient? api, SecureStorage? storage})
      : api = api ?? ApiClient(),
        _storage = storage ?? SecureStorage();

  final ApiClient api;
  final SecureStorage _storage;

  Future<bool> isAdminLoginProtected() async {
    final res = await api.get('/captcha/config');
    final data = (res['data'] as Map?)?.cast<String, dynamic>() ?? {};
    return data['protect_admin_login'] == true;
  }

  Future<MathChallenge> fetchMathChallenge() async {
    final res = await api.get('/captcha/math');
    return MathChallenge.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  /// Step 1 — validates email/password, triggers an SMS OTP to the admin's
  /// registered mobile. Returns the real (normalized) mobile — needed for
  /// resend/verify — and the masked version to display to the user.
  Future<({String mobile, String masked})> loginWithPassword({
    required String email,
    required String password,
    String? captchaId,
    String? captchaAnswer,
  }) async {
    final res = await api.post('/auth/login', data: {
      'email': email,
      'password': password,
      if (captchaId != null) 'captcha_id': captchaId,
      if (captchaAnswer != null) 'captcha_answer': captchaAnswer,
    });
    final data = (res['data'] as Map).cast<String, dynamic>();
    final mobile = data['mobile']?.toString() ?? '';
    return (mobile: mobile, masked: data['mobile_masked']?.toString() ?? mobile);
  }

  Future<void> resendOtp(String mobile) async {
    await api.post('/auth/resend-otp', data: {'mobile': mobile});
  }

  /// Step 2 — verifies the OTP and persists the Sanctum token + user profile.
  Future<ManagerUser> verifyOtp({required String mobile, required String code}) async {
    final res = await api.post('/auth/verify-otp', data: {'mobile': mobile, 'code': code});

    final token = res['token']?.toString();
    final userJson = (res['data'] as Map?)?.cast<String, dynamic>();
    if (token == null || token.isEmpty || userJson == null) {
      throw Exception('پاسخ ورود نامعتبر است.');
    }

    final user = ManagerUser.fromJson(userJson);
    await _storage.writeToken(token);
    await _storage.writeUserJson(jsonEncode(userJson));
    return user;
  }

  Future<ManagerUser> fetchMe() async {
    final res = await api.get('/auth/me');
    final user = ManagerUser.fromJson((res['data'] as Map).cast<String, dynamic>());
    await _storage.writeUserJson(jsonEncode(user.toJson()));
    return user;
  }

  Future<ManagerUser?> restoreSession() async {
    final token = await _storage.readToken();
    final userJson = await _storage.readUserJson();
    if (token == null || userJson == null) return null;
    try {
      final map = jsonDecode(userJson) as Map<String, dynamic>;
      return ManagerUser.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Best-effort — always clear local session even if the request fails.
    } finally {
      await _storage.clearAll();
    }
  }
}
