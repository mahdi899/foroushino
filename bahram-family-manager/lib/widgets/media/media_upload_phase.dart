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

  String statusLabel(double progressPercent) {
    switch (this) {
      case MediaUploadPhase.idle:
        return '';
      case MediaUploadPhase.uploading:
        return 'در حال آپلود… ${progressPercent.round()}٪';
      case MediaUploadPhase.finalizing:
        return 'در حال ثبت روی سرور…';
      case MediaUploadPhase.processing:
        return 'در حال آماده‌سازی روی هاست دانلود…';
      case MediaUploadPhase.ready:
        return '';
      case MediaUploadPhase.failed:
        return 'آپلود ناموفق';
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

typedef MediaUploadStateCallback = void Function(MediaUploadPhase phase, double progress);
