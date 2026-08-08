import 'package:dio/dio.dart';

import 'package:bahram_family_manager/config/app_config.dart';

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
        final msg = map['message'].toString();
        return ApiException(
          message: msg,
          code: _codeFromHttpStatus(statusCode, msg),
          statusCode: statusCode,
        );
      }
    }

    if (statusCode == 413) {
      return ApiException(
        message: 'حجم فایل از محدودیت سرور بیشتر است. فایل کوچک‌تری انتخاب کنید.',
        code: 'payload_too_large',
        statusCode: statusCode,
      );
    }

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return ApiException(
          message:
              'زمان اتصال به سرور تمام شد (${AppConfig.apiBaseUrl}). اینترنت را چک کنید؛ اگر VPN روشن است خاموش یا عوض کنید.',
          code: 'connection_timeout',
          statusCode: statusCode,
        );
      case DioExceptionType.sendTimeout:
        return ApiException(
          message:
              'ارسال فایل طول کشید و قطع شد. معمولاً به‌خاطر حجم بالای ویدیو/فایل یا اینترنت/VPN ناپایدار است. VPN را خاموش کنید یا فایل کوچک‌تری بفرستید.',
          code: 'send_timeout',
          statusCode: statusCode,
        );
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message:
              'پاسخ سرور دیر رسید. اینترنت یا VPN را بررسی کنید و دوباره تلاش کنید.',
          code: 'receive_timeout',
          statusCode: statusCode,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          message:
              'اتصال به سرور برقرار نشد (${AppConfig.apiBaseUrl}). اینترنت را چک کنید؛ اگر VPN روشن است خاموش یا عوض کنید.',
          code: 'connection_error',
          statusCode: statusCode,
        );
      case DioExceptionType.badCertificate:
        return ApiException(
          message: 'گواهی امنیتی سرور نامعتبر است. اتصال شبکه یا VPN را بررسی کنید.',
          code: 'bad_certificate',
          statusCode: statusCode,
        );
      case DioExceptionType.cancel:
        return ApiException(
          message: 'آپلود لغو شد.',
          code: 'cancelled',
          statusCode: statusCode,
        );
      case DioExceptionType.transformTimeout:
        return ApiException(
          message: 'پردازش پاسخ سرور طول کشید. دوباره تلاش کنید.',
          code: 'transform_timeout',
          statusCode: statusCode,
        );
      case DioExceptionType.badResponse:
        return ApiException(
          message: _messageForHttpStatus(statusCode),
          code: _codeFromHttpStatus(statusCode, null),
          statusCode: statusCode,
        );
      case DioExceptionType.unknown:
        final nested = e.error?.toString().toLowerCase() ?? '';
        if (nested.contains('socket') ||
            nested.contains('network') ||
            nested.contains('failed host lookup') ||
            nested.contains('connection')) {
          return ApiException(
            message:
                'اتصال شبکه قطع شد. اینترنت را چک کنید؛ اگر VPN روشن است خاموش یا عوض کنید.',
            code: 'network_error',
            statusCode: statusCode,
          );
        }
        return ApiException(
          message: 'خطای ناشناخته در ارتباط با سرور${statusCode != null ? ' (کد $statusCode)' : ''}.',
          code: 'unknown',
          statusCode: statusCode,
        );
    }
  }

  static String _messageForHttpStatus(int? statusCode) {
    return switch (statusCode) {
      401 => 'نشست شما منقضی شده. دوباره وارد شوید.',
      403 => 'اجازه این عملیات را ندارید.',
      404 => 'آدرس یا منبع روی سرور پیدا نشد.',
      413 => 'حجم فایل از محدودیت سرور بیشتر است. فایل کوچک‌تری انتخاب کنید.',
      422 => 'اطلاعات ارسالی نامعتبر است.',
      429 => 'تعداد درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.',
      500 => 'خطای داخلی سرور. چند لحظه بعد دوباره تلاش کنید.',
      502 || 503 || 504 => 'سرور موقتاً در دسترس نیست. اینترنت/VPN را چک کنید و دوباره تلاش کنید.',
      _ => 'خطای سرور${statusCode != null ? ' (کد $statusCode)' : ''}.',
    };
  }

  static String? _codeFromHttpStatus(int? statusCode, String? message) {
    if (statusCode == 413) return 'payload_too_large';
    if (message != null && message.contains('حجم')) return 'file_too_large';
    return statusCode != null ? 'http_$statusCode' : null;
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
