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

/// Best-effort relative-ish formatting without pulling in a heavy date
/// package beyond `intl` — good enough for a manager dashboard.
String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  try {
    final date = DateTime.parse(iso).toLocal();
    final two = (int n) => n.toString().padLeft(2, '0');
    return toFaDigits('${two(date.hour)}:${two(date.minute)} - ${two(date.day)}/${two(date.month)}/${date.year}');
  } catch (_) {
    return iso;
  }
}

String formatBytes(int? bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return '$bytes B';
  final kb = bytes / 1024;
  if (kb < 1024) return '${toFaDigits(kb.toStringAsFixed(1))} KB';
  final mb = kb / 1024;
  return '${toFaDigits(mb.toStringAsFixed(1))} MB';
}
