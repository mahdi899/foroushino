String digitsOnly(String value) => value.replaceAll(RegExp(r'\D'), '');

String normalizeIranPhone(String phone) {
  final digits = digitsOnly(phone);
  if (digits.startsWith('98') && digits.length >= 12) {
    return '0${digits.substring(2)}';
  }
  if (digits.startsWith('9') && digits.length == 10) {
    return '0$digits';
  }
  return digits;
}

bool isValidIranMobile(String phone) => RegExp(r'^09\d{9}$').hasMatch(phone);

String toTelUri(String phone) {
  final digits = digitsOnly(phone);
  if (digits.startsWith('98')) return 'tel:+${digits}';
  if (digits.startsWith('0')) return 'tel:$digits';
  return 'tel:$digits';
}

String toFaDigits(String input) {
  const en = '0123456789';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  var out = input;
  for (var i = 0; i < en.length; i++) {
    out = out.replaceAll(en[i], fa[i]);
  }
  return out;
}

String formatDurationFa(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '${toFaDigits(m.toString().padLeft(2, '0'))}:${toFaDigits(s.toString().padLeft(2, '0'))}';
}

String formatPhoneFa(String phone) {
  final d = normalizeIranPhone(phone);
  if (d.length == 11) {
    return toFaDigits('${d.substring(0, 4)} ${d.substring(4, 7)} ${d.substring(7)}');
  }
  return toFaDigits(d);
}

bool phonesMatch(String a, String b) {
  final da = digitsOnly(normalizeIranPhone(a));
  final db = digitsOnly(normalizeIranPhone(b));
  if (da == db) return true;
  if (da.length >= 10 && db.length >= 10) {
    return da.substring(da.length - 10) == db.substring(db.length - 10);
  }
  return false;
}
