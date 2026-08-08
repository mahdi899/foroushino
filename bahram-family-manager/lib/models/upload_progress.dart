import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';

export 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';

/// Byte-accurate upload progress for media ingest UI.
class UploadProgress {
  const UploadProgress({
    required this.phase,
    required this.sentBytes,
    required this.totalBytes,
    this.hostStatus,
    this.pollAttempt,
    this.statusDetail,
  });

  final MediaUploadPhase phase;
  final int sentBytes;
  final int totalBytes;

  /// Backend media status while [phase] is [MediaUploadPhase.processing]
  /// (`queued` / `transferring` / `processing`).
  final String? hostStatus;

  /// 1-based poll / reconnect attempt shown during host prep.
  final int? pollAttempt;

  /// Optional override line (e.g. reconnecting after a transient network blip).
  final String? statusDetail;

  double get fraction =>
      totalBytes > 0 ? (sentBytes / totalBytes).clamp(0.0, 1.0) : 0;

  /// Single 0–100 pipeline percent across upload → finalize → host prep.
  double get overallPercent => phase.overallPercent(fraction);

  /// Persian status line for overlays / editor captions.
  String get statusLabel => phase.statusLabel(
        overallPercent,
        hostStatus: hostStatus,
        pollAttempt: pollAttempt,
        statusDetail: statusDetail,
      );

  UploadProgress copyWith({
    MediaUploadPhase? phase,
    int? sentBytes,
    int? totalBytes,
    String? hostStatus,
    int? pollAttempt,
    String? statusDetail,
    bool clearHostMeta = false,
  }) {
    return UploadProgress(
      phase: phase ?? this.phase,
      sentBytes: sentBytes ?? this.sentBytes,
      totalBytes: totalBytes ?? this.totalBytes,
      hostStatus: clearHostMeta ? null : (hostStatus ?? this.hostStatus),
      pollAttempt: clearHostMeta ? null : (pollAttempt ?? this.pollAttempt),
      statusDetail: clearHostMeta ? null : (statusDetail ?? this.statusDetail),
    );
  }
}

typedef MediaUploadStateCallback = void Function(UploadProgress progress);
