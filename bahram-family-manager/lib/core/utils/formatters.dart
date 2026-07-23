const _persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/// Converts ASCII digits in [input] to Persian digits for display.
String toFaDigits(String input) {
  final buffer = StringBuffer();
  for (final char in input.split('')) {
    final code = char.codeUnitAt(0);
    if (code >= 48 && code <= 57) {
      buffer.write(_persianDigits[code - 48]);
    } else {
      buffer.write(char);
    }
  }
  return buffer.toString();
}

String faNumber(num value) => toFaDigits(value.toStringAsFixed(value % 1 == 0 ? 0 : 1));

String faPercent(double value) => '${toFaDigits(value.toStringAsFixed(0))}٪';

/// Formats an ISO-8601 instant as Iran (Asia/Tehran) wall clock with Jalali date.
String formatDateTime(String? iso) => formatJalaliDateTime(iso);

/// Jalali (Persian) calendar date + Tehran time.
String formatJalaliDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  try {
    final utc = DateTime.parse(iso).toUtc();
    final tehran = utc.add(const Duration(hours: 3, minutes: 30));
    final jalali = _gregorianToJalali(tehran.year, tehran.month, tehran.day);
    final two = (int n) => n.toString().padLeft(2, '0');
    return toFaDigits(
      '${two(tehran.hour)}:${two(tehran.minute)} - ${toFaDigits(jalali[2].toString())} ${_jalaliMonthName(jalali[1])} ${toFaDigits(jalali[0].toString())}',
    );
  } catch (_) {
    return iso;
  }
}

String _jalaliMonthName(int month) {
  const names = [
    '',
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ];
  return names[month.clamp(1, 12)];
}

/// Returns [jy, jm, jd].
List<int> _gregorianToJalali(int gy, int gm, int gd) {
  final gdm = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  final gy2 = gm > 2 ? gy + 1 : gy;
  var days = (365 * gy) + ((gy2 + 3) ~/ 4) - ((gy2 + 99) ~/ 100) + ((gy2 + 399) ~/ 400) - 80 + gd;
  for (var i = 0; i < gm; i++) {
    days += gdm[i];
  }
  jy += 33 * (days ~/ 12053);
  days %= 12053;
  jy += 4 * (days ~/ 1461);
  days %= 1461;
  if (days > 365) {
    jy += (days - 1) ~/ 365;
    days = (days - 1) % 365;
  }
  final jm = days < 186 ? 1 + (days ~/ 31) : 7 + ((days - 186) ~/ 30);
  final jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

String formatBytes(int? bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return '$bytes B';
  final kb = bytes / 1024;
  if (kb < 1024) return '${toFaDigits(kb.toStringAsFixed(1))} KB';
  final mb = kb / 1024;
  return '${toFaDigits(mb.toStringAsFixed(1))} MB';
}
