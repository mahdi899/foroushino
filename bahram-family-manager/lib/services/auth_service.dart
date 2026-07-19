import 'dart:convert';

import 'package:bahram_family_manager/core/api/api_client.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/services/secure_storage.dart';

sealed class AdminLoginResult {
  const AdminLoginResult();

  const factory AdminLoginResult.authenticated(ManagerUser user) = AdminLoginAuthenticated;
  const factory AdminLoginResult.otpRequired({
    required String mobile,
    required String masked,
  }) = AdminLoginOtpRequired;
}

final class AdminLoginAuthenticated extends AdminLoginResult {
  const AdminLoginAuthenticated(this.user);
  final ManagerUser user;
}

final class AdminLoginOtpRequired extends AdminLoginResult {
  const AdminLoginOtpRequired({required this.mobile, required this.masked});
  final String mobile;
  final String masked;
}

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

  /// Step 1 — validates email/password. OTP-exempt admins receive a token
  /// immediately; others get an SMS OTP on their registered mobile.
  Future<AdminLoginResult> loginWithPassword({
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
    final token = res['token']?.toString();

    if (data['otp_required'] == false && token != null && token.isNotEmpty) {
      final user = ManagerUser.fromJson(data);
      await _storage.writeToken(token);
      await _storage.writeUserJson(jsonEncode(data));
      return AdminLoginResult.authenticated(user);
    }

    final mobile = data['mobile']?.toString() ?? '';
    return AdminLoginResult.otpRequired(
      mobile: mobile,
      masked: data['mobile_masked']?.toString() ?? mobile,
    );
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
