import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/layout/shell_scope.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/navigation/quick_action_button.dart';
import 'package:bahram_family_manager/widgets/posts/post_list_tile.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
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

  EdgeInsets _bodyPadding(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);
    if (isDesktop) return AppBreakpoints.pagePadding(context);

    final bottomInset = MediaQuery.paddingOf(context).bottom;
    return EdgeInsets.fromLTRB(
      AppSpacing.md,
      AppSpacing.md,
      AppSpacing.md,
      AppSpacing.xl + 56 + bottomInset,
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final shell = ShellScope.maybeOf(context);
    final canCompose = shell?.onComposePost != null;
    final isDesktop = AppBreakpoints.isDesktop(context);
    final compact = !isDesktop;
    final sectionGap = compact ? AppSpacing.md : AppSpacing.lg;

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: const Text('خانه'),
        showShellActions: true,
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded), tooltip: 'بروزرسانی'),
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
                padding: _bodyPadding(context),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (user != null) ...[
                    _GreetingCard(
                      name: user.name,
                      pendingComments: stats.pendingComments,
                      compact: compact,
                      onPendingTap: stats.pendingComments > 0 && shell != null
                          ? () => shell.goToLabel('نظرات')
                          : null,
                    ),
                    SizedBox(height: sectionGap),
                  ],
                  if (canCompose || shell != null) ...[
                    Row(
                      children: [
                        if (canCompose)
                          QuickActionButton(
                            icon: Icons.edit_rounded,
                            label: 'پست جدید',
                            color: AppColors.primary,
                            onTap: shell!.onComposePost!,
                          ),
                        if (canCompose && shell != null) SizedBox(width: compact ? AppSpacing.sm : AppSpacing.md),
                        if (shell != null)
                          QuickActionButton(
                            icon: Icons.forum_rounded,
                            label: 'نظرات',
                            color: AppColors.accent,
                            onTap: () => shell.goToLabel('نظرات'),
                          ),
                        if (shell != null) SizedBox(width: compact ? AppSpacing.sm : AppSpacing.md),
                        if (shell != null)
                          QuickActionButton(
                            icon: Icons.campaign_rounded,
                            label: 'پست‌ها',
                            color: AppColors.gold,
                            onTap: () => shell.goToLabel('پست‌ها'),
                          ),
                      ],
                    ),
                    SizedBox(height: sectionGap),
                  ],
                  Text(
                    'امروز',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  if (compact)
                    _TodayStatsPanel(
                      posts: stats.postsToday,
                      reactions: stats.reactionsToday,
                      comments: stats.newCommentsToday,
                      actions: stats.actionsCompletedToday,
                    )
                  else
                    StatCardGrid(
                      children: [
                        StatCard(
                          title: 'منتشر شده',
                          value: stats.postsToday,
                          icon: Icons.campaign_rounded,
                          color: AppColors.primary,
                        ),
                        StatCard(
                          title: 'واکنش',
                          value: stats.reactionsToday,
                          icon: Icons.favorite_rounded,
                          color: AppColors.error,
                        ),
                        StatCard(
                          title: 'نظر جدید',
                          value: stats.newCommentsToday,
                          icon: Icons.chat_bubble_rounded,
                          color: AppColors.warning,
                        ),
                        StatCard(
                          title: 'اکشن تکمیل',
                          value: stats.actionsCompletedToday,
                          icon: Icons.task_alt_rounded,
                          color: AppColors.success,
                        ),
                      ],
                    ),
                  if (stats.pendingComments > 0 && user == null) ...[
                    SizedBox(height: sectionGap),
                    GlassPanel(
                      borderRadius: 16,
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
                      onTap: shell != null ? () => shell.goToLabel('نظرات') : null,
                      child: Row(
                        children: [
                          Icon(Icons.notification_important_rounded, color: AppColors.gold, size: 24),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Text(
                              '${toFaDigits(stats.pendingComments.toString())} نظر در انتظار بررسی',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                          ),
                          const Icon(Icons.chevron_left_rounded, size: 20),
                        ],
                      ),
                    ),
                  ],
                  SizedBox(height: sectionGap),
                  _AiSummaryCard(summary: stats.aiSummary, compact: compact),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _TodayStatsPanel extends StatelessWidget {
  const _TodayStatsPanel({
    required this.posts,
    required this.reactions,
    required this.comments,
    required this.actions,
  });

  final int posts;
  final int reactions;
  final int comments;
  final int actions;

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.campaign_rounded, 'منتشر شده', posts, AppColors.primary),
      (Icons.favorite_rounded, 'واکنش', reactions, AppColors.error),
      (Icons.chat_bubble_rounded, 'نظر جدید', comments, AppColors.warning),
      (Icons.task_alt_rounded, 'اکشن تکمیل', actions, AppColors.success),
    ];

    return GlassPanel(
      borderRadius: 18,
      blur: 0,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              Divider(
                height: 1,
                indent: AppSpacing.md,
                endIndent: AppSpacing.md,
                color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.35),
              ),
            _TodayStatRow(
              icon: items[i].$1,
              label: items[i].$2,
              value: items[i].$3,
              color: items[i].$4,
            ),
          ],
        ],
      ),
    );
  }
}

class _TodayStatRow extends StatelessWidget {
  const _TodayStatRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm + 2),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [color.withValues(alpha: 0.85), color]),
              borderRadius: BorderRadius.circular(13),
              boxShadow: AppShadows.primaryGlow,
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            ),
          ),
          Text(
            toFaDigits(value.toString()),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
          ),
        ],
      ),
    );
  }
}

class _GreetingCard extends StatelessWidget {
  const _GreetingCard({
    required this.name,
    required this.pendingComments,
    required this.compact,
    this.onPendingTap,
  });

  final String name;
  final int pendingComments;
  final bool compact;
  final VoidCallback? onPendingTap;

  @override
  Widget build(BuildContext context) {
    final showPending = pendingComments > 0;

    return PanelGradientCard(
      variant: PanelGradientVariant.teal,
      padding: EdgeInsets.all(compact ? AppSpacing.md : AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: compact ? 42 : 48,
                height: compact ? 42 : 48,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Text(
                  name.isNotEmpty ? name.substring(0, 1) : 'ب',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: compact ? 16 : 18,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'سلام $name',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: compact ? 15 : null,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'امروز در خانواده داداش بهرام',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: compact ? 12 : 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (showPending) ...[
            SizedBox(height: compact ? AppSpacing.sm : AppSpacing.md),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onPendingTap,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: compact ? AppSpacing.sm : AppSpacing.sm + 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.notification_important_rounded, color: Colors.white, size: 18),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          '${toFaDigits(pendingComments.toString())} نظر در انتظار بررسی',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Icon(Icons.chevron_left_rounded, color: Colors.white.withValues(alpha: 0.9), size: 18),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AiSummaryCard extends StatelessWidget {
  const _AiSummaryCard({required this.summary, this.compact = false});

  final AiDailySummary summary;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);

    return PanelSectionCard(
      title: compact ? 'تحلیل AI' : 'تحلیل هوش مصنوعی خانواده',
      icon: Icons.auto_awesome_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (summary.lowSample)
            Text(
              summary.note ?? 'حجم نمونه کم است.',
              style: TextStyle(color: muted, fontSize: compact ? 13 : null),
            )
          else if (summary.topics.isEmpty)
            Text(
              'هنوز موضوع مشخصی از نظرات استخراج نشده.',
              style: TextStyle(color: muted, fontSize: compact ? 13 : null),
            )
          else if (compact)
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: summary.topics.map((t) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.22)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        t.topic.isEmpty ? 'بدون موضوع' : t.topic,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        faPercent(t.percent),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            )
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
            SizedBox(height: compact ? AppSpacing.sm : AppSpacing.md),
            Text(
              summary.suggestion!,
              style: TextStyle(
                fontStyle: FontStyle.italic,
                color: Theme.of(context).colorScheme.primary,
                fontSize: compact ? 13 : null,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
