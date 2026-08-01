import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';

export 'package:bahram_family_manager/widgets/media/media_upload_phase.dart' show MediaUploadPhase, MediaUploadStateCallback;

/// Byte-accurate upload progress for media ingest UI.
class UploadProgress {
  const UploadProgress({
    required this.phase,
    required this.sentBytes,
    required this.totalBytes,
  });

  final MediaUploadPhase phase;
  final int sentBytes;
  final int totalBytes;

  double get fraction =>
      totalBytes > 0 ? (sentBytes / totalBytes).clamp(0.0, 1.0) : 0;

  UploadProgress copyWith({
    MediaUploadPhase? phase,
    int? sentBytes,
    int? totalBytes,
  }) {
    return UploadProgress(
      phase: phase ?? this.phase,
      sentBytes: sentBytes ?? this.sentBytes,
      totalBytes: totalBytes ?? this.totalBytes,
    );
  }
}

typedef MediaUploadStateCallback = void Function(UploadProgress progress);
