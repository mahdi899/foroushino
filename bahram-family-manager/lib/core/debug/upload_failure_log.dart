import 'package:flutter/foundation.dart';

import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/debug/api_debug_log.dart';

/// Records a precise, human-readable upload failure for the debug panel / console.
class UploadFailureLog {
  UploadFailureLog._();

  /// Always records (even when general API logging is off) so upload issues stay visible.
  static void record({
    required String context,
    required String reason,
    String? filename,
    String? code,
    int? statusCode,
  }) {
    final name = (filename == null || filename.isEmpty) ? '—' : filename;
    final codePart = (code == null || code.isEmpty) ? '' : '[$code] ';
    final detail = '$codePart$name — $reason';

    debugPrint('UploadFailure[$context]: $detail'
        '${statusCode != null ? ' (HTTP $statusCode)' : ''}');

    ApiDebugLog.entries.insert(
      0,
      ApiLogEntry(
        at: DateTime.now(),
        method: 'UPLOAD',
        path: context,
        statusCode: statusCode,
        error: detail,
      ),
    );
    const maxEntries = 80;
    if (ApiDebugLog.entries.length > maxEntries) {
      ApiDebugLog.entries.removeRange(maxEntries, ApiDebugLog.entries.length);
    }
  }

  static void recordError({
    required String context,
    required Object error,
    String? filename,
  }) {
    if (error is ApiException) {
      record(
        context: context,
        reason: error.message,
        filename: filename,
        code: error.code,
        statusCode: error.statusCode,
      );
      return;
    }
    record(
      context: context,
      reason: error.toString(),
      filename: filename,
      code: 'unknown',
    );
  }
}
