import 'package:dio/dio.dart';

/// Normalizes the two error envelope shapes used by the backend:
///   - Laravel's default validation error: { message, errors: { field: [msg] } }
///   - The custom Family envelope: { error: { code, message_fa, details? } }
class ApiException implements Exception {
  ApiException({
    required this.message,
    this.code,
    this.statusCode,
    this.fieldErrors,
  });

  final String message;
  final String? code;
  final int? statusCode;
  final Map<String, List<String>>? fieldErrors;

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    final statusCode = e.response?.statusCode;

    if (data is Map) {
      final map = data.cast<String, dynamic>();

      final error = map['error'];
      if (error is Map) {
        final errorMap = error.cast<String, dynamic>();
        return ApiException(
          message: errorMap['message_fa']?.toString() ?? 'خطایی رخ داد.',
          code: errorMap['code']?.toString(),
          statusCode: statusCode,
          fieldErrors: _fieldErrorsFrom(errorMap['details']),
        );
      }

      final errors = map['errors'];
      if (errors is Map) {
        final fields = _fieldErrorsFrom(errors);
        final firstMessage = fields?.values.firstOrNull?.firstOrNull;
        return ApiException(
          message: firstMessage ?? map['message']?.toString() ?? 'اطلاعات ارسالی نامعتبر است.',
          code: 'validation_error',
          statusCode: statusCode,
          fieldErrors: fields,
        );
      }

      if (map['message'] != null) {
        return ApiException(message: map['message'].toString(), statusCode: statusCode);
      }
    }

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError) {
      return ApiException(message: 'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.', statusCode: statusCode);
    }

    return ApiException(message: 'خطای ناشناخته در ارتباط با سرور.', statusCode: statusCode);
  }

  static Map<String, List<String>>? _fieldErrorsFrom(dynamic raw) {
    if (raw is! Map) return null;
    return raw.map((key, value) {
      final list = value is List ? value : [value];
      return MapEntry(key.toString(), list.map((e) => e.toString()).toList());
    });
  }

  @override
  String toString() => message;
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
