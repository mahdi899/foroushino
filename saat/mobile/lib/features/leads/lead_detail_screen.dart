import 'package:flutter/material.dart';
import 'package:saat_mobile/config/app_config.dart';
import 'package:saat_mobile/core/api/api_exception.dart';
import 'package:saat_mobile/core/labels.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/features/calls/call_result_screen.dart';
import 'package:saat_mobile/features/calls/dialer_screen.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/services/call_tracker_service.dart';
import 'package:saat_mobile/services/calls_service.dart';
import 'package:saat_mobile/services/leads_service.dart';
import 'package:url_launcher/url_launcher.dart';

class LeadDetailScreen extends StatefulWidget {
  const LeadDetailScreen({super.key, required this.leadId});

  final int leadId;

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen> {
  final _leads = LeadsService();
  final _calls = CallsService();
  final _tracker = CallTrackerService();

  Lead? _lead;
  var _loading = true;
  var _calling = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _lead = await _leads.fetchLead(widget.leadId);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startCall() async {
    final lead = _lead;
    if (lead == null || _calling) return;

    setState(() => _calling = true);
    try {
      if (AppConfig.voipEnabled) {
        // VoIP path — implemented later.
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('VoIP هنوز فعال نشده — از تماس سیم‌کارت استفاده کنید.')),
        );
        return;
      }

      final granted = await _tracker.ensurePermissions();
      if (!granted && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('برای ثبت مدت واقعی تماس، دسترسی تلفن و تاریخچه تماس لازم است.'),
          ),
        );
      }

      final session = await _calls.startCall(lead.id);
      _tracker.beginTracking(lead.phone);

      final uri = Uri.parse(toTelUri(lead.phone));
      final launched = await launchUrl(uri);
      if (!launched) throw ApiException(message: 'باز کردن اپ تلفن ممکن نشد.');

      if (!mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => DialerScreen(
            lead: session.lead,
            callId: session.call.id,
            tracker: _tracker,
          ),
        ),
      );

      final metrics = await _tracker.readLatestMetrics();
      _tracker.clear();

      if (!mounted) return;
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => CallResultScreen(
            lead: session.lead,
            callId: session.call.id,
            metrics: metrics,
          ),
        ),
      );
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      _tracker.clear();
      if (mounted) setState(() => _calling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final lead = _lead;
    if (lead == null) {
      return const Scaffold(body: Center(child: Text('سرنخ یافت نشد')));
    }

    return Scaffold(
      appBar: AppBar(title: Text(lead.fullName)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(formatPhoneFa(lead.phone), textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  if (lead.city != null) ...[
                    const SizedBox(height: 8),
                    Text(lead.city!),
                  ],
                  if (lead.temperature != null) ...[
                    const SizedBox(height: 8),
                    Text('دما: ${temperatureLabels[lead.temperature] ?? lead.temperature}'),
                  ],
                  if (lead.source != null) ...[
                    const SizedBox(height: 8),
                    Text('منبع: ${sourceLabels[lead.source] ?? lead.source}'),
                  ],
                  const SizedBox(height: 8),
                  Text('تعداد تماس: ${toFaDigits('${lead.callCount}')}'),
                  if (lead.lastNote != null && lead.lastNote!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text('یادداشت: ${lead.lastNote}'),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _calling ? null : _startCall,
            icon: _calling
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.call_rounded),
            label: Text(_calling ? 'در حال آماده‌سازی...' : 'تماس با سیم‌کارت'),
          ),
        ],
      ),
    );
  }
}
