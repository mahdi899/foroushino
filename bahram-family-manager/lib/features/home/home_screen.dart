import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Future<HomeStats>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.home();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('خانه'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded)),
          IconButton(
            onPressed: () => context.read<AppState>().logout(),
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<HomeStats>(
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

            final stats = snapshot.data!;
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (user != null)
                  Text('سلام ${user.name} 👋', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                const Text('امروز در خانواده داداش بهرام', style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    _StatCard(title: 'پست منتشرشده', value: stats.postsToday, icon: Icons.campaign_rounded, color: AppColors.primary),
                    _StatCard(title: 'واکنش', value: stats.reactionsToday, icon: Icons.favorite_rounded, color: AppColors.error),
                    _StatCard(
                      title: 'نظر جدید',
                      value: stats.newCommentsToday,
                      icon: Icons.chat_bubble_rounded,
                      color: AppColors.warning,
                    ),
                    _StatCard(
                      title: 'اکشن تکمیل‌شده',
                      value: stats.actionsCompletedToday,
                      icon: Icons.task_alt_rounded,
                      color: AppColors.success,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (stats.pendingComments > 0)
                  Card(
                    color: AppColors.warning.withOpacity(0.08),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.notification_important_rounded, color: AppColors.warning),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              '${toFaDigits(stats.pendingComments.toString())} نظر در انتظار بررسی',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                _AiSummaryCard(summary: stats.aiSummary),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value, required this.icon, required this.color});

  final String title;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color),
            Text(toFaDigits(value.toString()), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
            Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _AiSummaryCard extends StatelessWidget {
  const _AiSummaryCard({required this.summary});

  final AiDailySummary summary;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 18),
                SizedBox(width: 8),
                Text('تحلیل هوش مصنوعی خانواده', style: TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 12),
            if (summary.lowSample)
              Text(summary.note ?? 'حجم نمونه کم است.', style: const TextStyle(color: AppColors.textMuted))
            else if (summary.topics.isEmpty)
              const Text('هنوز موضوع مشخصی از نظرات استخراج نشده.', style: TextStyle(color: AppColors.textMuted))
            else
              ...summary.topics.map(
                (t) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Expanded(child: Text(t.topic.isEmpty ? 'بدون موضوع' : t.topic)),
                      Text(faPercent(t.percent), style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            if (summary.suggestion != null) ...[
              const SizedBox(height: 8),
              Text(summary.suggestion!, style: const TextStyle(fontStyle: FontStyle.italic, color: AppColors.primaryDark)),
            ],
          ],
        ),
      ),
    );
  }
}
