import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  var _days = 30;
  Future<AnalyticsData>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() => _future = context.read<AppState>().manager.analytics(days: _days));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('تحلیل خانواده')),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<AnalyticsData>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [Text(messageOf(snapshot.error!), style: const TextStyle(color: AppColors.error))],
              );
            }

            final data = snapshot.data!;
            final totals = _Totals.fromDaily(data.daily);

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Wrap(
                  spacing: 8,
                  children: [7, 30, 90].map((d) {
                    return ChoiceChip(
                      label: Text('${toFaDigits(d.toString())} روز'),
                      selected: _days == d,
                      onSelected: (_) => setState(() {
                        _days = d;
                        _load();
                      }),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.6,
                  children: [
                    _StatCard(title: 'عضو جدید', value: totals.newMembers),
                    _StatCard(title: 'پست منتشرشده', value: totals.postsPublished),
                    _StatCard(title: 'واکنش', value: totals.reactions),
                    _StatCard(title: 'اکشن تکمیل‌شده', value: totals.actionsCompleted),
                  ],
                ),
                const SizedBox(height: 20),
                _SectionTitle('منابع ورودی'),
                if (data.sources.isEmpty)
                  const Text('داده‌ای موجود نیست.', style: TextStyle(color: AppColors.textMuted))
                else
                  _BarList(
                    items: data.sources.map((s) => (label: s.source, value: s.joins)).toList(),
                  ),
                const SizedBox(height: 20),
                _SectionTitle('رویدادهای ورودی'),
                if (data.entryEvents.isEmpty)
                  const Text('داده‌ای موجود نیست.', style: TextStyle(color: AppColors.textMuted))
                else
                  _BarList(
                    items: data.entryEvents.map((e) => (label: e.name, value: e.joins)).toList(),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Totals {
  _Totals({required this.newMembers, required this.postsPublished, required this.reactions, required this.actionsCompleted});

  final int newMembers;
  final int postsPublished;
  final int reactions;
  final int actionsCompleted;

  factory _Totals.fromDaily(List<DailyMetricPoint> daily) {
    var members = 0, posts = 0, reactions = 0, actions = 0;
    for (final d in daily) {
      members += d.newMembers;
      posts += d.postsPublished;
      reactions += d.reactions;
      actions += d.actionsCompleted;
    }
    return _Totals(newMembers: members, postsPublished: posts, reactions: reactions, actionsCompleted: actions);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value});

  final String title;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(toFaDigits(value.toString()), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
    );
  }
}

class _BarList extends StatelessWidget {
  const _BarList({required this.items});

  final List<({String label, int value})> items;

  @override
  Widget build(BuildContext context) {
    final max = items.map((e) => e.value).fold<int>(1, (a, b) => a > b ? a : b);

    return Column(
      children: items.take(8).map((item) {
        final ratio = item.value / max;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text(item.label, overflow: TextOverflow.ellipsis)),
                  Text(toFaDigits(item.value.toString()), style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(value: ratio.clamp(0, 1), minHeight: 8),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
