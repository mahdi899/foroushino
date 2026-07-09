import 'dart:io';

import 'package:call_log/call_log.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/models/models.dart';

/// Tracks native SIM calls via Android Call Log.
/// VoIP will use a separate implementation later.
class CallTrackerService {
  DateTime? _startedAt;
  String? _expectedPhone;

  Future<bool> ensurePermissions() async {
    if (!Platform.isAndroid) return false;

    final status = await Permission.phone.request();
    return status.isGranted;
  }

  void beginTracking(String expectedPhone) {
    _expectedPhone = normalizeIranPhone(expectedPhone);
    _startedAt = DateTime.now();
  }

  void clear() {
    _startedAt = null;
    _expectedPhone = null;
  }

  Future<VerifiedCallMetrics?> readLatestMetrics() async {
    if (!Platform.isAndroid) return null;
    if (_startedAt == null || _expectedPhone == null) return null;

    final from = _startedAt!.subtract(const Duration(seconds: 5));
    final entries = await CallLog.query(
      dateFrom: from.millisecondsSinceEpoch,
      dateTo: DateTime.now().millisecondsSinceEpoch,
    );

    CallLogEntry? best;
    for (final entry in entries) {
      if (entry.callType != CallType.outgoing) continue;
      final number = entry.number ?? '';
      if (!phonesMatch(number, _expectedPhone!)) continue;
      if (best == null || (entry.timestamp ?? 0) > (best.timestamp ?? 0)) {
        best = entry;
      }
    }

    if (best == null) {
      return const VerifiedCallMetrics(
        durationSec: 0,
        numberMatched: false,
        wasAnswered: false,
      );
    }

    final duration = best.duration ?? 0;
    return VerifiedCallMetrics(
      durationSec: duration,
      numberMatched: phonesMatch(best.number ?? '', _expectedPhone!),
      wasAnswered: duration > 0,
      dialedNumber: best.number,
    );
  }
}
