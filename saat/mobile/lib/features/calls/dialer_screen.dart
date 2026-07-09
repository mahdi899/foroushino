import 'dart:async';

import 'package:flutter/material.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/services/call_tracker_service.dart';

class DialerScreen extends StatefulWidget {
  const DialerScreen({
    super.key,
    required this.lead,
    required this.callId,
    required this.tracker,
  });

  final Lead lead;
  final int callId;
  final CallTrackerService tracker;

  @override
  State<DialerScreen> createState() => _DialerScreenState();
}

class _DialerScreenState extends State<DialerScreen> with WidgetsBindingObserver {
  var _seconds = 0;
  VerifiedCallMetrics? _metrics;
  Timer? _uiTimer;
  Timer? _syncTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _uiTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && (_metrics == null || !_metrics!.wasAnswered)) {
        setState(() => _seconds += 1);
      }
    });
    _syncTimer = Timer.periodic(const Duration(seconds: 2), (_) => _syncFromCallLog());
  }

  @override
  void dispose() {
    _uiTimer?.cancel();
    _syncTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncFromCallLog();
    }
  }

  Future<void> _syncFromCallLog() async {
    final metrics = await widget.tracker.readLatestMetrics();
    if (!mounted || metrics == null) return;
    setState(() {
      _metrics = metrics;
      if (metrics.durationSec > _seconds) {
        _seconds = metrics.durationSec;
      }
    });
  }

  Future<void> _hangUp() async {
    await _syncFromCallLog();
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              CircleAvatar(
                radius: 44,
                backgroundColor: AppColors.surfaceTint,
                child: Text(
                  widget.lead.firstName.isNotEmpty ? widget.lead.firstName[0] : '?',
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 16),
              Text(widget.lead.fullName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(formatPhoneFa(widget.lead.phone), textDirection: TextDirection.ltr, style: const TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 24),
              Text(
                formatDurationFa(_seconds),
                style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
              const SizedBox(height: 8),
              Text(
                _metrics == null
                    ? 'در حال تماس...'
                    : _metrics!.numberMatched
                        ? 'شماره تأیید شد • ${_metrics!.wasAnswered ? 'پاسخ داده شد' : 'بدون مکالمه'}'
                        : 'در انتظار تأیید از تاریخچه تماس',
                style: const TextStyle(color: AppColors.textMuted),
              ),
              const Spacer(),
              FloatingActionButton.large(
                backgroundColor: AppColors.error,
                onPressed: _hangUp,
                child: const Icon(Icons.call_end_rounded, size: 32),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
