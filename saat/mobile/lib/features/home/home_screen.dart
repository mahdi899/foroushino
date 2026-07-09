import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:saat_mobile/core/labels.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/features/leads/lead_detail_screen.dart';
import 'package:saat_mobile/features/leads/leads_list_screen.dart';
import 'package:saat_mobile/models/models.dart';
import 'package:saat_mobile/state/app_state.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final home = state.home;
    final user = state.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('خانه'),
        actions: [
          IconButton(
            onPressed: () => state.refreshData(),
            icon: const Icon(Icons.refresh_rounded),
          ),
          IconButton(
            onPressed: () => state.logout(),
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: state.refreshData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (user != null)
              Text(
                'سلام ${user.name}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
            const SizedBox(height: 16),
            if (home != null) _StatsRow(home: home),
            const SizedBox(height: 16),
            if (home?.suggestedLead != null)
              _SuggestedLeadCard(lead: home!.suggestedLead!),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LeadsListScreen()),
                );
              },
              icon: const Icon(Icons.people_alt_rounded),
              label: const Text('لیست سرنخ‌ها'),
            ),
            if (state.error != null) ...[
              const SizedBox(height: 16),
              Text(state.error!, style: const TextStyle(color: AppColors.error)),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.home});

  final AgentHome home;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatTile(title: 'تماس امروز', value: '${toFaDigits('${home.callsToday}')}/${toFaDigits('${home.callGoal}')}')),
        const SizedBox(width: 12),
        Expanded(child: _StatTile(title: 'فروش امروز', value: toFaDigits('${home.salesToday}'))),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _SuggestedLeadCard extends StatelessWidget {
  const _SuggestedLeadCard({required this.lead});

  final Lead lead;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => LeadDetailScreen(leadId: lead.id)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('سرنخ پیشنهادی', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(lead.fullName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(formatPhoneFa(lead.phone), textDirection: TextDirection.ltr),
              if (lead.temperature != null) ...[
                const SizedBox(height: 8),
                Text(temperatureLabels[lead.temperature] ?? lead.temperature!),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
