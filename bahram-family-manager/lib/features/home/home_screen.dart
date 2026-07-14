import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/posts/post_list_tile.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

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
          builder: (context, snapshot) => AsyncBody<HomeStats>(
            snapshot: snapshot,
            builder: (context, stats) {
              return ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (user != null) ...[
                    PanelGradientCard(
                      variant: PanelGradientVariant.teal,
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              user.name.isNotEmpty ? user.name.substring(0, 1) : 'ب',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'سلام ${user.name}',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                                Text(
                                  'امروز در خانواده داداش بهرام',
                                  style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                  ],
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: AppSpacing.md,
                    crossAxisSpacing: AppSpacing.md,
                    childAspectRatio: 1.45,
                    children: [
                      StatCard(title: 'پست منتشرشده', value: stats.postsToday, icon: Icons.campaign_rounded, color: AppColors.primary),
                      StatCard(title: 'واکنش', value: stats.reactionsToday, icon: Icons.favorite_rounded, color: AppColors.error),
                      StatCard(title: 'نظر جدید', value: stats.newCommentsToday, icon: Icons.chat_bubble_rounded, color: AppColors.warning),
                      StatCard(title: 'اکشن تکمیل‌شده', value: stats.actionsCompletedToday, icon: Icons.task_alt_rounded, color: AppColors.success),
                    ],
                  ),
                  if (stats.pendingComments > 0) ...[
                    const SizedBox(height: AppSpacing.md),
                    PanelGradientCard(
                      variant: PanelGradientVariant.gold,
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Row(
                        children: [
                          const Icon(Icons.notification_important_rounded, color: Colors.white),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Text(
                              '${toFaDigits(stats.pendingComments.toString())} نظر در انتظار بررسی',
                              style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  _AiSummaryCard(summary: stats.aiSummary),
                ],
              );
            },
          ),
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
    return PanelSectionCard(
      title: 'تحلیل هوش مصنوعی خانواده',
      icon: Icons.auto_awesome_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (summary.lowSample)
            Text(summary.note ?? 'حجم نمونه کم است.', style: const TextStyle(color: AppColors.textMuted))
          else if (summary.topics.isEmpty)
            const Text('هنوز موضوع مشخصی از نظرات استخراج نشده.', style: TextStyle(color: AppColors.textMuted))
          else
            ...summary.topics.map(
              (t) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Row(
                  children: [
                    Expanded(child: Text(t.topic.isEmpty ? 'بدون موضوع' : t.topic)),
                    Text(faPercent(t.percent), style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
                  ],
                ),
              ),
            ),
          if (summary.suggestion != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(summary.suggestion!, style: const TextStyle(fontStyle: FontStyle.italic, color: AppColors.primaryDark)),
          ],
        ],
      ),
    );
  }
}
