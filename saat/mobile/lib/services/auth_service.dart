import 'dart:convert';

import 'package:saat_mobile/core/api/api_client.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/services/secure_storage.dart';

class AuthService {
  AuthService({ApiClient? api, SecureStorage? storage})
      : _api = api ?? ApiClient(),
        _storage = storage ?? SecureStorage();

  final ApiClient _api;
  final SecureStorage _storage;

  Future<String> requestPhoneOtp(String phone) async {
    final data = await _api.postData<Map<String, dynamic>>(
      '/auth/phone-otp/request',
      body: {'phone': phone},
      map: (raw) => raw as Map<String, dynamic>,
    );
    return data['hint']?.toString() ?? '';
  }

  Future<SaatUser> verifyPhoneOtp({
    required String phone,
    required String code,
  }) async {
    final data = await _api.postData<Map<String, dynamic>>(
      '/auth/phone-otp/verify',
      body: {'phone': phone, 'code': code},
      map: (raw) => raw as Map<String, dynamic>,
    );

    final token = data['token']?.toString() ?? '';
    final userJson = data['user'] as Map<String, dynamic>;
    final user = SaatUser.fromJson(userJson);

    await _storage.writeToken(token);
    await _storage.writeUserJson(jsonEncode(userJson));
    return user;
  }

  Future<void> logout() async {
    try {
      await _api.postData<dynamic>(
        '/auth/logout',
        map: (raw) => raw,
      );
    } finally {
      await _storage.clearAll();
    }
  }

  Future<SaatUser?> restoreSession() async {
    final token = await _storage.readToken();
    final userJson = await _storage.readUserJson();
    if (token == null || userJson == null) return null;
    final map = jsonDecode(userJson) as Map<String, dynamic>;
    return SaatUser.fromJson(map);
  }
}
