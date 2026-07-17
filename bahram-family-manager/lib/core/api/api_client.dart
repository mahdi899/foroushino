import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/debug/api_debug_log.dart';
import 'package:bahram_family_manager/services/secure_storage.dart';

/// Thin Dio wrapper around the Laravel `/api/v1` envelope used by the
/// Family Manager endpoints: success responses are `{ data, meta? }`;
/// auth/verify-otp is the one exception returning `{ token, data }` at the
/// top level (handled directly in AuthService).
class ApiClient {
  ApiClient({SecureStorage? storage}) : _storage = storage ?? SecureStorage() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 60),
        sendTimeout: const Duration(minutes: 5),
        headers: {'Accept': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (kDebugMode) {
            options.extra['__started'] = DateTime.now().millisecondsSinceEpoch;
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            final started = response.requestOptions.extra['__started'] as int?;
            final elapsed = started == null ? null : DateTime.now().millisecondsSinceEpoch - started;
            ApiDebugLog.record(
              method: response.requestOptions.method,
              path: response.requestOptions.uri.path,
              statusCode: response.statusCode,
              durationMs: elapsed,
            );
          }
          handler.next(response);
        },
        onError: (error, handler) async {
          if (kDebugMode) {
            final started = error.requestOptions.extra['__started'] as int?;
            final elapsed = started == null ? null : DateTime.now().millisecondsSinceEpoch - started;
            ApiDebugLog.record(
              method: error.requestOptions.method,
              path: error.requestOptions.uri.path,
              statusCode: error.response?.statusCode,
              durationMs: elapsed,
              error: error.message,
            );
          }
          if (error.response?.statusCode == 401) {
            await _storage.clearToken();
            onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  final SecureStorage _storage;
  late final Dio _dio;

  /// Set by AppState so a global 401 can drop the user back to the login screen.
  void Function()? onUnauthorized;

  Dio get dio => _dio;

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) {
    return _send(() => _dio.get(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? data}) {
    return _send(() => _dio.post(path, data: data));
  }

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? data}) {
    return _send(() => _dio.patch(path, data: data));
  }

  Future<Map<String, dynamic>> delete(String path) {
    return _send(() => _dio.delete(path));
  }

  Future<Map<String, dynamic>> postForm(
    String path,
    FormData form, {
    void Function(int sent, int total)? onSendProgress,
  }) {
    return _send(() => _dio.post(path, data: form, onSendProgress: onSendProgress));
  }

  Future<Map<String, dynamic>> _send(Future<Response<dynamic>> Function() call) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is Map) {
        return body.cast<String, dynamic>();
      }
      return <String, dynamic>{'data': body};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
