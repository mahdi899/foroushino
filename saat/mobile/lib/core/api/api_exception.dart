import 'package:dio/dio.dart';

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

  @override
  String toString() => message;
}

class ApiEnvelope<T> {
  ApiEnvelope({
    required this.success,
    required this.message,
    this.data,
    this.meta,
  });

  factory ApiEnvelope.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic raw)? mapData,
  ) {
    return ApiEnvelope(
      success: json['success'] == true,
      message: json['message']?.toString() ?? '',
      data: mapData != null && json['data'] != null
          ? mapData(json['data'])
          : json['data'] as T?,
      meta: json['meta'] as Map<String, dynamic>?,
    );
  }

  final bool success;
  final String message;
  final T? data;
  final Map<String, dynamic>? meta;
}
