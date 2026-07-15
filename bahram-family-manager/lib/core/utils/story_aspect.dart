/// Portrait story format (Instagram-style): 9 wide × 16 tall.
const double kStoryAspectRatio = 9 / 16;
const double kStoryHeightToWidth = 16 / 9;

/// Accepts ~±12% deviation from exact 9:16.
bool isStoryAspectRatio(int? width, int? height, {double tolerance = 0.12}) {
  if (width == null || height == null || width <= 0 || height <= 0) {
    return true;
  }
  if (height <= width) {
    return false;
  }
  final ratio = height / width;
  return (ratio - kStoryHeightToWidth).abs() / kStoryHeightToWidth <= tolerance;
}

String storyAspectHint(int? width, int? height) {
  if (width == null || height == null || width <= 0 || height <= 0) {
    return 'نسبت پیشنهادی: ۹:۱۶ (عمودی، مثل استوری اینستاگرام)';
  }
  if (!isStoryAspectRatio(width, height)) {
    return 'این فایل ۹:۱۶ نیست ($width×$height). برای نمایش تمام‌صفحه، تصویر یا ویدیو عمودی ۹:۱۶ انتخاب کنید.';
  }
  return 'نسبت ۹:۱۶ — آماده انتشار';
}
