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

/// Returns Jalali [jy, jm, jd] from Gregorian calendar date.
List<int> gregorianToJalali(int gy, int gm, int gd) => _gregorianToJalali(gy, gm, gd);

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

/// Tehran wall clock derived from current instant (no timezone package).
DateTime tehranNow() => DateTime.now().toUtc().add(const Duration(hours: 3, minutes: 30));

/// Gregorian [gy, gm, gd] from Jalali [jy, jm, jd].
List<int> jalaliToGregorian(int jy, int jm, int jd) {
  var jy2 = jy + 1595;
  var days = -355668 + (365 * jy2) + (jy2 ~/ 33) * 8 + ((jy2 % 33 + 3) ~/ 4) + jd;
  if (jm < 7) {
    days += (jm - 1) * 31;
  } else {
    days += (jm - 7) * 30 + 186;
  }
  var gy = 400 * (days ~/ 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * (--days ~/ 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * (days ~/ 1461);
  days %= 1461;
  if (days > 365) {
    gy += (days - 1) ~/ 365;
    days = (days - 1) % 365;
  }
  var gd = days + 1;
  final salA = [0, 31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  salA[2] = (gy % 4 == 0 && gy % 100 != 0 || gy % 400 == 0) ? 29 : 28;
  var gm = 0;
  while (gm < 13 && gd > salA[gm]) {
    gd -= salA[gm];
    gm++;
  }
  return [gy, gm, gd];
}

/// Tehran wall-clock components → UTC [DateTime] for API payloads.
DateTime tehranWallClockToUtc(int gy, int gm, int gd, int hour, int minute) {
  final tehranAsUtc = DateTime.utc(gy, gm, gd, hour, minute);
  return tehranAsUtc.subtract(const Duration(hours: 3, minutes: 30));
}

DateTime jalaliWallClockToUtc(int jy, int jm, int jd, int hour, int minute) {
  final g = jalaliToGregorian(jy, jm, jd);
  return tehranWallClockToUtc(g[0], g[1], g[2], hour, minute);
}

String formatBytes(int? bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return '$bytes B';
  final kb = bytes / 1024;
  if (kb < 1024) return '${toFaDigits(kb.toStringAsFixed(1))} KB';
  final mb = kb / 1024;
  return '${toFaDigits(mb.toStringAsFixed(1))} MB';
}
