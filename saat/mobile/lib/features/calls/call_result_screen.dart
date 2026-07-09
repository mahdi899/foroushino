import 'package:flutter/material.dart';
import 'package:saat_mobile/core/api/api_exception.dart';
import 'package:saat_mobile/core/labels.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/services/calls_service.dart';

class CallResultScreen extends StatefulWidget {
  const CallResultScreen({
    super.key,
    required this.lead,
    required this.callId,
    this.metrics,
  });

  final Lead lead;
  final int callId;
  final VerifiedCallMetrics? metrics;

  @override
  State<CallResultScreen> createState() => _CallResultScreenState();
}

class _CallResultScreenState extends State<CallResultScreen> {
  final _calls = CallsService();
  final _noteCtrl = TextEditingController();

  String? _result;
  var _submitting = false;

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final result = _result;
    if (result == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('نتیجه تماس را انتخاب کنید')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final metrics = widget.metrics;
      var note = _noteCtrl.text.trim();
      if (metrics != null) {
        final verification = metrics.numberMatched ? 'شماره تأیید شد' : 'شماره تأیید نشد';
        note = [note, verification].where((e) => e.isNotEmpty).join(' • ');
      }

      await _calls.submitResult(
        callId: widget.callId,
        result: result,
        note: note.isEmpty ? null : note,
        durationSec: metrics?.durationSec ?? 0,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('نتیجه تماس ثبت شد')),
      );
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final metrics = widget.metrics;

    return Scaffold(
      appBar: AppBar(title: const Text('ثبت نتیجه تماس')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.lead.fullName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  const SizedBox(height: 4),
                  Text(formatPhoneFa(widget.lead.phone), textDirection: TextDirection.ltr),
                  if (metrics != null) ...[
                    const SizedBox(height: 12),
                    Text('مدت تماس: ${formatDurationFa(metrics.durationSec)}'),
                    Text(
                      metrics.numberMatched ? '✓ شماره با سرنخ مطابقت دارد' : '✗ شماره تأیید نشد',
                      style: TextStyle(
                        color: metrics.numberMatched ? AppColors.success : AppColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('نتیجه', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: callResultOptions.entries.map((entry) {
              final selected = _result == entry.key;
              return ChoiceChip(
                label: Text(entry.value),
                selected: selected,
                onSelected: (_) => setState(() => _result = entry.key),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _noteCtrl,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'یادداشت (اختیاری)'),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('ذخیره نتیجه'),
          ),
        ],
      ),
    );
  }
}
