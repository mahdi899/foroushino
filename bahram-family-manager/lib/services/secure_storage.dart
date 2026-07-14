import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  SecureStorage() : _storage = const FlutterSecureStorage();

  static const _tokenKey = 'family_manager_api_token';
  static const _userKey = 'family_manager_user_json';

  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> writeToken(String token) => _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<String?> readUserJson() => _storage.read(key: _userKey);

  Future<void> writeUserJson(String json) => _storage.write(key: _userKey, value: json);

  Future<void> clearAll() => _storage.deleteAll();
}
