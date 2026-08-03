import 'package:bahram_family_manager/core/utils/formatters.dart';

/// Client-side media size checks before loading/uploading large files.
class MediaSizeGuard {
  MediaSizeGuard._();

  static const int maxBytes = 100 * 1024 * 1024;

  static bool isOversize(int bytes) => bytes > maxBytes;

  /// User-facing message when [bytes] exceeds [maxBytes]; otherwise `null`.
  static String? oversizeMessage(int bytes) {
    if (!isOversize(bytes)) return null;
    return 'حجم فایل (${formatBytes(bytes)}) بیشتر از ۱۰۰ مگابایت است. لطفاً فایل کوچک‌تری انتخاب کنید.';
  }
}
