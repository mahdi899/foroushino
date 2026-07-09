import 'package:dio/dio.dart';
import 'package:saat_mobile/config/app_config.dart';
import 'package:saat_mobile/core/api/api_exception.dart';
import 'package:saat_mobile/services/secure_storage.dart';

class ApiClient {
  ApiClient({SecureStorage? storage})
      : _storage = storage ?? SecureStorage() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await _storage.clearToken();
          }
          handler.next(error);
        },
      ),
    );
  }

  final SecureStorage _storage;
  late final Dio _dio;

  Dio get dio => _dio;

  Future<T> getData<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(dynamic raw) map,
  }) async {
    final envelope = await _request(() => _dio.get(path, queryParameters: query));
    return map(envelope.data);
  }

  Future<T> postData<T>(
    String path, {
    Map<String, dynamic>? body,
    Map<String, dynamic>? headers,
    required T Function(dynamic raw) map,
  }) async {
    final envelope = await _request(
      () => _dio.post(path, data: body, options: Options(headers: headers)),
    );
    return map(envelope.data);
  }

  Future<ApiEnvelope<dynamic>> _request(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      final json = response.data;
      if (json is! Map<String, dynamic>) {
        throw ApiException(message: 'پاسخ سرور نامعتبر است.');
      }

      final envelope = ApiEnvelope<dynamic>.fromJson(json, (raw) => raw);
      if (!envelope.success) {
        throw ApiException(
          message: envelope.message.isNotEmpty
              ? envelope.message
              : 'خطا در ارتباط با سرور',
          code: json['code']?.toString(),
          statusCode: response.statusCode,
          fieldErrors: _parseFieldErrors(json['errors']),
        );
      }
      return envelope;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        throw ApiException(
          message: data['message']?.toString() ?? 'خطا در ارتباط با سرور',
          code: data['code']?.toString(),
          statusCode: e.response?.statusCode,
          fieldErrors: _parseFieldErrors(data['errors']),
        );
      }
      throw ApiException(
        message: 'اتصال برقرار نشد. اینترنت یا آدرس API را بررسی کنید.',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Map<String, List<String>>? _parseFieldErrors(dynamic raw) {
    if (raw is! Map) return null;
    return raw.map(
      (key, value) => MapEntry(
        key.toString(),
        (value as List).map((e) => e.toString()).toList(),
      ),
    );
  }
}
