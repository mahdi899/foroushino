import 'package:bahram_family_manager/core/utils/formatters.dart';

/// Client-side media size checks — aligned with backend `family.media.max_*_mb`.
class MediaSizeGuard {
  MediaSizeGuard._();

  static const int maxVideoBytes = 500 * 1024 * 1024;
  static const int maxVoiceBytes = 50 * 1024 * 1024;
  static const int maxImageBytes = 50 * 1024 * 1024;

  /// Legacy alias (video ceiling) for call sites that do not pass a type yet.
  static const int maxBytes = maxVideoBytes;

  static int maxBytesFor(String type) {
    return switch (type) {
      'video' || 'video_note' => maxVideoBytes,
      'voice' || 'audio' => maxVoiceBytes,
      'image' || 'image_album' => maxImageBytes,
      _ => maxVideoBytes,
    };
  }

  static int maxMbFor(String type) => maxBytesFor(type) ~/ (1024 * 1024);

  static bool isOversize(int bytes, {String type = 'video'}) =>
      bytes > maxBytesFor(type);

  /// User-facing message when [bytes] exceeds the limit for [type]; otherwise `null`.
  static String? oversizeMessage(int bytes, {String type = 'video'}) {
    if (!isOversize(bytes, type: type)) return null;
    final mb = toFaDigits(maxMbFor(type).toString());
    return 'حجم فایل (${formatBytes(bytes)}) بیشتر از $mb مگابایت است. لطفاً فایل کوچک‌تری انتخاب کنید.';
  }
}
