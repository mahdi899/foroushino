import 'package:bahram_family_manager/core/utils/formatters.dart';

/// Tracks client-side media upload / server pipeline state for post editor UI.
enum MediaUploadPhase {
  idle,
  uploading,
  finalizing,
  processing,
  ready,
  failed,
}

extension MediaUploadPhaseX on MediaUploadPhase {
  bool get isActive =>
      this == MediaUploadPhase.uploading ||
      this == MediaUploadPhase.finalizing ||
      this == MediaUploadPhase.processing;

  bool get showsProgressOverlay => isActive;

  /// Short Persian stage name for notifications / compact UI.
  String get stageLabel {
    switch (this) {
      case MediaUploadPhase.idle:
        return '';
      case MediaUploadPhase.uploading:
        return 'آپلود';
      case MediaUploadPhase.finalizing:
        return 'ثبت روی سرور';
      case MediaUploadPhase.processing:
        return 'آماده‌سازی هاست';
      case MediaUploadPhase.ready:
        return 'آماده';
      case MediaUploadPhase.failed:
        return 'ناموفق';
    }
  }

  /// Human-readable status with overall pipeline percent (0–100).
  String statusLabel(
    double overallPercent, {
    String? hostStatus,
    int? pollAttempt,
    String? statusDetail,
  }) {
    final detail = statusDetail?.trim();
    if (detail != null && detail.isNotEmpty) {
      return detail;
    }

    final pct = toFaDigits(overallPercent.round().clamp(0, 100).toString());
    final attemptSuffix = (pollAttempt != null && pollAttempt > 0)
        ? ' · تلاش ${toFaDigits(pollAttempt.toString())}'
        : '';

    switch (this) {
      case MediaUploadPhase.idle:
        return '';
      case MediaUploadPhase.uploading:
        return 'در حال آپلود… $pct٪';
      case MediaUploadPhase.finalizing:
        return 'در حال ثبت روی سرور… $pct٪';
      case MediaUploadPhase.processing:
        return '${_hostPrepLabel(hostStatus)}$attemptSuffix';
      case MediaUploadPhase.ready:
        return '';
      case MediaUploadPhase.failed:
        return 'آپلود ناموفق';
    }
  }

  static String _hostPrepLabel(String? hostStatus) {
    switch (hostStatus) {
      case 'queued':
        return 'در صف آماده‌سازی هاست دانلود…';
      case 'transferring':
        return 'در حال انتقال به هاست دانلود…';
      case 'processing':
        return 'در حال آماده‌سازی روی هاست دانلود…';
      default:
        return 'در حال آماده‌سازی روی هاست دانلود…';
    }
  }

  /// Maps phase + byte transport fraction (0–1) onto a single 0–100 pipeline %.
  ///
  /// Bands: upload 0–70, finalize 70–85, host processing 85–99, ready 100.
  double overallPercent(double transportFraction) {
    final f = transportFraction.clamp(0.0, 1.0);
    switch (this) {
      case MediaUploadPhase.idle:
        return 0;
      case MediaUploadPhase.uploading:
        return f * 70;
      case MediaUploadPhase.finalizing:
        return 70 + (f * 15);
      case MediaUploadPhase.processing:
        // Bytes are already fully sent; hold in the host-prep band.
        return 88;
      case MediaUploadPhase.ready:
        return 100;
      case MediaUploadPhase.failed:
        return (f * 100).clamp(0, 99);
    }
  }

  static MediaUploadPhase fromMediaStatus(String? status) {
    if (status == null || status.isEmpty) return MediaUploadPhase.idle;
    if (status == 'ready') return MediaUploadPhase.ready;
    if (status == 'failed') return MediaUploadPhase.failed;
    if (status == 'uploading') return MediaUploadPhase.uploading;
    return MediaUploadPhase.processing;
  }
}
