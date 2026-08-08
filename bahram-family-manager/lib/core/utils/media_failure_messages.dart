/// Maps backend / transport failure text into precise Persian reasons for the UI and logs.
class MediaFailureMessages {
  MediaFailureMessages._();

  /// Prefer [failureReason] from the API; fall back to a clear Persian default.
  static String pipeline(String? failureReason) {
    final raw = failureReason?.trim();
    if (raw == null || raw.isEmpty) {
      return 'پردازش رسانه روی سرور ناموفق بود.';
    }

    final lower = raw.toLowerCase();

    if (lower.contains('temporary file missing') ||
        lower.contains('assembled upload file is missing')) {
      return 'فایل موقت روی سرور پیدا نشد؛ آپلود ناقص مانده یا پاک شده است. دوباره آپلود کنید.';
    }
    if (lower.contains('unable to read temporary file') ||
        lower.contains('cannot read uploaded file') ||
        lower.contains('cannot open upload session')) {
      return 'خواندن فایل موقت روی سرور ممکن نبود. دوباره آپلود کنید.';
    }
    if (lower.contains('size mismatch') ||
        lower.contains('does not match declared total_size')) {
      return 'حجم فایل آپلود‌شده با اندازه اعلام‌شده یکی نیست (احتمالاً آپلود ناقص). دوباره آپلود کنید.';
    }
    if (lower.contains('ftp') || lower.contains('remote upload')) {
      return 'انتقال فایل به هاست دانلود/FTP ناموفق بود: $raw';
    }
    if (lower.contains('timeout') || lower.contains('timed out')) {
      return 'زمان انتقال فایل تمام شد. اینترنت یا VPN را بررسی کنید و دوباره تلاش کنید.';
    }
    if (lower.contains('chunks must be uploaded in order') ||
        lower.contains('upload incomplete')) {
      return 'آپلود تکه‌ای ناقص ماند. دوباره از ابتدا آپلود کنید.';
    }
    if (raw.contains('حجم فایل') || lower.contains('too large') || lower.contains('max')) {
      return raw.contains('حجم') ? raw : 'حجم فایل از محدودیت مجاز بیشتر است.';
    }

    // Already Persian (or mixed) — surface as-is.
    if (RegExp(r'[\u0600-\u06FF]').hasMatch(raw)) {
      return raw;
    }

    return 'پردازش رسانه ناموفق بود: $raw';
  }

  static String timeoutWaitingReady() =>
      'فایل روی هاست هنوز آماده نیست (زمان انتظار تمام شد). اینترنت/VPN را چک کنید؛ اگر حجم ویدیو خیلی بالاست صبر بیشتری لازم است یا دوباره آپلود کنید.';
}
