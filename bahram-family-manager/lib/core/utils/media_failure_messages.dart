import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';

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
    if (lower.contains('ftp') || lower.contains('remote upload') || lower.contains('download host')) {
      return 'انتقال فایل به هاست دانلود ناموفق بود: $raw';
    }
    if (lower.contains('timeout') || lower.contains('timed out')) {
      return 'زمان انتقال فایل تمام شد. اینترنت یا VPN را بررسی کنید و دوباره تلاش کنید.';
    }
    if (lower.contains('connection') || lower.contains('could not connect')) {
      return hostPrepConnectionFailed();
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
      'آماده‌سازی هاست دانلود تمام نشد (زمان انتظار به پایان رسید). '
      'اینترنت/VPN را چک کنید؛ در لوکال ممکن است هاست دانلود خاموش یا پیکربندی‌نشده باشد. '
      'روی سرور production معمولاً کار می‌کند — دوباره آپلود کنید یا کمی بعد تلاش کنید.';

  static String hostPrepConnectionFailed() =>
      'اتصال برای آماده‌سازی هاست دانلود برقرار نشد. '
      'اینترنت یا VPN را بررسی کنید؛ در محیط لوکال ممکن است هاست دانلود/CDN در دسترس نباشد.';

  static String hostPrepReconnect(int attempt) =>
      'قطع ارتباط با سرور؛ تلاش مجدد برای آماده‌سازی هاست… (${toFaDigits(attempt.toString())})';

  static bool looksLikeNetworkFailure(Object error) {
    if (error is ApiException) {
      const networkCodes = {
        'connection_timeout',
        'connection_error',
        'network_error',
        'receive_timeout',
        'send_timeout',
        'bad_certificate',
      };
      if (error.code != null && networkCodes.contains(error.code)) return true;
    }
    final msg = error.toString().toLowerCase();
    return msg.contains('socket') ||
        msg.contains('connection') ||
        msg.contains('network') ||
        msg.contains('timed out') ||
        msg.contains('timeout') ||
        msg.contains('failed host lookup');
  }
}
