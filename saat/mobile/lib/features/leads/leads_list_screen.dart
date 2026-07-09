import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:saat_mobile/core/labels.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/features/leads/lead_detail_screen.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/state/app_state.dart';

class LeadsListScreen extends StatelessWidget {
  const LeadsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final leads = context.watch<AppState>().leads;

    return Scaffold(
      appBar: AppBar(title: const Text('سرنخ‌ها')),
      body: leads.isEmpty
          ? const Center(child: Text('سرنخی یافت نشد'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: leads.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final lead = leads[index];
                return _LeadTile(lead: lead);
              },
            ),
    );
  }
}

class _LeadTile extends StatelessWidget {
  const _LeadTile({required this.lead});

  final Lead lead;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(lead.fullName, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(formatPhoneFa(lead.phone), textDirection: TextDirection.ltr),
            if (lead.source != null)
              Text(sourceLabels[lead.source] ?? lead.source!, style: const TextStyle(fontSize: 12)),
          ],
        ),
        trailing: lead.isLocked
            ? const Icon(Icons.lock_rounded, color: AppColors.secondary)
            : const Icon(Icons.chevron_left_rounded),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => LeadDetailScreen(leadId: lead.id)),
          );
        },
      ),
    );
  }
}
