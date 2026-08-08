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
  /// dio_web_adapter rejects sendTimeout on body-less requests (GET/DELETE).
  static const _bodySendTimeout = Duration(minutes: 5);

  /// Large video uploads over a slow/unstable connection can take longer
  /// than the default body timeout above, especially when the background
  /// keep-alive lets an upload run for many minutes uninterrupted.
  static const _uploadSendTimeout = Duration(minutes: 10);

  ApiClient({SecureStorage? storage}) : _storage = storage ?? SecureStorage() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 120),
        sendTimeout: kIsWeb ? null : _bodySendTimeout,
        headers: {
          'Accept': 'application/json',
          // Browsers refuse User-Agent on XHR; native still sends it.
          // Backend captcha bypass keys off X-Bahram-Client (and UA on native).
          'X-Bahram-Client': 'BahramFamilyManager/${AppConfig.appVersion}',
          if (!kIsWeb) 'User-Agent': 'BahramFamilyManager/${AppConfig.appVersion}',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (!_tokenCacheReady) {
            _cachedToken = await _storage.readToken();
            _tokenCacheReady = true;
          }
          final token = _cachedToken;
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
            final resolved = ApiException.fromDio(error);
            ApiDebugLog.record(
              method: error.requestOptions.method,
              path: error.requestOptions.uri.path,
              statusCode: error.response?.statusCode ?? resolved.statusCode,
              durationMs: elapsed,
              error: resolved.code != null
                  ? '[${resolved.code}] ${resolved.message}'
                  : resolved.message,
            );
          }
          if (error.response?.statusCode == 401) {
            resetAuthCache();
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
  String? _cachedToken;
  bool _tokenCacheReady = false;

  /// All three collaborators must share a single [ApiClient] instance — it's
  /// wired in [AppState] and passed into services.

  /// Set by AppState so a global 401 can drop the user back to the login screen.
  void Function()? onUnauthorized;

  /// Clears in-memory bearer token (call after logout).
  void resetAuthCache() {
    _cachedToken = null;
    _tokenCacheReady = false;
  }

  Dio get dio => _dio;

  Options? get _webBodySendTimeout =>
      kIsWeb ? Options(sendTimeout: _bodySendTimeout) : null;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  }) {
    return _send(() => _dio.get(path, queryParameters: query, cancelToken: cancelToken));
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    CancelToken? cancelToken,
  }) {
    return _send(() => _dio.post(
          path,
          data: data,
          options: _webBodySendTimeout,
          cancelToken: cancelToken,
        ));
  }

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? data}) {
    return _send(() => _dio.patch(path, data: data, options: _webBodySendTimeout));
  }

  Future<Map<String, dynamic>> delete(String path) {
    return _send(() => _dio.delete(path));
  }

  /// Uploads a [form] body. Uses a longer send timeout than plain JSON
  /// requests (large video/voice files on slow connections) and accepts an
  /// optional [cancelToken] so an in-flight upload can be aborted, e.g. when
  /// the user cancels from the notification or the app logs out.
  Future<Map<String, dynamic>> postForm(
    String path,
    FormData form, {
    void Function(int sent, int total)? onSendProgress,
    CancelToken? cancelToken,
  }) {
    return _send(() => _dio.post(
          path,
          data: form,
          onSendProgress: onSendProgress,
          cancelToken: cancelToken,
          options: Options(sendTimeout: _uploadSendTimeout),
        ));
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
