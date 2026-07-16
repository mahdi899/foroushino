import 'package:flutter/foundation.dart';

/// Ring buffer of recent API calls — visible in Settings when debug mode is on.
class ApiDebugLog {
  ApiDebugLog._();

  static const _maxEntries = 80;
  static final entries = <ApiLogEntry>[];

  static bool enabled = kDebugMode;

  static void record({
    required String method,
    required String path,
    int? statusCode,
    int? durationMs,
    String? error,
  }) {
    if (!enabled) return;
    entries.insert(
      0,
      ApiLogEntry(
        at: DateTime.now(),
        method: method,
        path: path,
        statusCode: statusCode,
        durationMs: durationMs,
        error: error,
      ),
    );
    if (entries.length > _maxEntries) {
      entries.removeRange(_maxEntries, entries.length);
    }
  }

  static void clear() => entries.clear();
}

class ApiLogEntry {
  ApiLogEntry({
    required this.at,
    required this.method,
    required this.path,
    this.statusCode,
    this.durationMs,
    this.error,
  });

  final DateTime at;
  final String method;
  final String path;
  final int? statusCode;
  final int? durationMs;
  final String? error;

  bool get ok => error == null && statusCode != null && statusCode! >= 200 && statusCode! < 400;
}
