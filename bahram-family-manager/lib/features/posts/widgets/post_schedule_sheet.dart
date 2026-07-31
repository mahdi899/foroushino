import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

/// Telegram-style schedule picker with Jalali date + Tehran time.
Future<DateTime?> showPostScheduleSheet(BuildContext context) async {
  final tehran = tehranNow().add(const Duration(hours: 1));
  final initialJalali = gregorianToJalali(tehran.year, tehran.month, tehran.day);

  return showModalBottomSheet<DateTime>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => _PostScheduleSheet(
      initialJy: initialJalali[0],
      initialJm: initialJalali[1],
      initialJd: initialJalali[2],
      initialHour: tehran.hour,
      initialMinute: tehran.minute,
    ),
  );
}

class _PostScheduleSheet extends StatefulWidget {
  const _PostScheduleSheet({
    required this.initialJy,
    required this.initialJm,
    required this.initialJd,
    required this.initialHour,
    required this.initialMinute,
  });

  final int initialJy;
  final int initialJm;
  final int initialJd;
  final int initialHour;
  final int initialMinute;

  @override
  State<_PostScheduleSheet> createState() => _PostScheduleSheetState();
}

class _PostScheduleSheetState extends State<_PostScheduleSheet> {
  late int _jy;
  late int _jm;
  late int _jd;
  late int _hour;
  late int _minute;

  @override
  void initState() {
    super.initState();
    _jy = widget.initialJy;
    _jm = widget.initialJm;
    _jd = widget.initialJd;
    _hour = widget.initialHour;
    _minute = widget.initialMinute;
  }

  int _daysInJalaliMonth(int jy, int jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    // Esfand — leap check simplified via gregorian conversion round-trip.
    final g = jalaliToGregorian(jy, jm, 30);
    final gNext = jalaliToGregorian(jy, jm, 31);
    return g[2] == gNext[2] ? 29 : 30;
  }

  DateTime _selectedUtc() => jalaliWallClockToUtc(_jy, _jm, _jd, _hour, _minute);

  String _previewLabel() => formatJalaliDateTime(_selectedUtc().toUtc().toIso8601String());

  bool _isValidFuture() {
    final selected = _selectedUtc();
    return selected.isAfter(DateTime.now().toUtc().add(const Duration(minutes: 1)));
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.65);
    final years = List.generate(2, (i) => widget.initialJy + i);
    final maxDay = _daysInJalaliMonth(_jy, _jm);
    if (_jd > maxDay) _jd = maxDay;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
        child: GlassPanel(
          borderRadius: 22,
          blur: 0,
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: scheme.outline.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                  ),
                ),
              ),
              Row(
                children: [
                  Icon(Icons.schedule_rounded, color: AppColors.gold, size: 22),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'انتشار در ساعت خاص',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                      color: scheme.onSurface,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'مثل تلگرام — پست در زمان مشخص خودکار منتشر می‌شود',
                style: TextStyle(color: muted, fontSize: 13),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('تاریخ (جلالی)', style: TextStyle(fontWeight: FontWeight.w600, color: muted, fontSize: 12)),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: _ScheduleDropdown<int>(
                      label: 'سال',
                      value: _jy,
                      items: years,
                      itemLabel: (v) => toFaDigits(v.toString()),
                      onChanged: (v) => setState(() => _jy = v),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    flex: 2,
                    child: _ScheduleDropdown<int>(
                      label: 'ماه',
                      value: _jm,
                      items: List.generate(12, (i) => i + 1),
                      itemLabel: (v) => _jalaliMonthName(v),
                      onChanged: (v) => setState(() => _jm = v),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _ScheduleDropdown<int>(
                      label: 'روز',
                      value: _jd,
                      items: List.generate(maxDay, (i) => i + 1),
                      itemLabel: (v) => toFaDigits(v.toString()),
                      onChanged: (v) => setState(() => _jd = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text('ساعت (تهران)', style: TextStyle(fontWeight: FontWeight.w600, color: muted, fontSize: 12)),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: _ScheduleDropdown<int>(
                      label: 'ساعت',
                      value: _hour,
                      items: List.generate(24, (i) => i),
                      itemLabel: (v) => toFaDigits(v.toString().padLeft(2, '0')),
                      onChanged: (v) => setState(() => _hour = v),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _ScheduleDropdown<int>(
                      label: 'دقیقه',
                      value: _minute,
                      items: List.generate(60, (i) => i),
                      itemLabel: (v) => toFaDigits(v.toString().padLeft(2, '0')),
                      onChanged: (v) => setState(() => _minute = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: scheme.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.event_available_rounded, color: scheme.primary, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        'انتشار در ${_previewLabel()}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurface,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (!_isValidFuture()) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'زمان باید حداقل یک دقیقه بعد از الان باشد.',
                  style: TextStyle(color: AppColors.error, fontSize: 12),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _isValidFuture() ? () => Navigator.pop(context, _selectedUtc()) : null,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: scheme.primary,
                ),
                child: const Text('تأیید زمان‌بندی', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('انصراف'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScheduleDropdown<T> extends StatelessWidget {
  const _ScheduleDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.itemLabel,
    required this.onChanged,
  });

  final String label;
  final T value;
  final List<T> items;
  final String Function(T) itemLabel;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      items: items
          .map((item) => DropdownMenuItem(value: item, child: Text(itemLabel(item))))
          .toList(),
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
    );
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
