import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/features/entry_links/entry_links_panel.dart';
import 'package:bahram_family_manager/features/entry_links/entry_links_screen.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/posts/post_list_tile.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

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
    setState(() {
      _future = context.read<AppState>().manager.analytics(days: _days);
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);
    final bottomPad = isDesktop ? 0.0 : 24.0;

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: const Text('تحلیل خانواده'),
        actions: [
          if (context.watch<AppState>().user?.can('family.entry_links.manage') ?? false)
            IconButton(
              tooltip: 'لینک‌های ورود',
              icon: const Icon(Icons.link_rounded),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const EntryLinksScreen()),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<AnalyticsData>(
          future: _future,
          builder: (context, snapshot) => AsyncBody<AnalyticsData>(
            snapshot: snapshot,
            builder: (context, data) {
              final totals = _Totals.fromDaily(data.daily);
              final padding = AppBreakpoints.pagePadding(context);

              return ListView(
                padding: padding.copyWith(bottom: padding.bottom + bottomPad),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  PanelSectionCard(
                    title: 'بازه زمانی',
                    icon: Icons.date_range_rounded,
                    child: Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [7, 30, 90].map((d) {
                        final selected = _days == d;
                        return FilterChip(
                          label: Text('${toFaDigits(d.toString())} روز'),
                          selected: selected,
                          onSelected: (_) {
                            setState(() => _days = d);
                            _load();
                          },
                          showCheckmark: false,
                          selectedColor: AppColors.primarySoft,
                          labelStyle: TextStyle(
                            color: selected ? AppColors.primary : AppColors.textMuted,
                            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  StatCardGrid(
                    children: [
                      StatCard(title: 'عضو جدید', value: totals.newMembers, icon: Icons.person_add_rounded, color: AppColors.primary),
                      StatCard(title: 'پست منتشرشده', value: totals.postsPublished, icon: Icons.campaign_rounded, color: AppColors.accent),
                      StatCard(title: 'واکنش', value: totals.reactions, icon: Icons.favorite_rounded, color: AppColors.error),
                      StatCard(title: 'اکشن تکمیل‌شده', value: totals.actionsCompleted, icon: Icons.task_alt_rounded, color: AppColors.gold),
                    ],
                  ),
                  if (context.watch<AppState>().user?.can('family.entry_links.manage') ?? false) ...[
                    const SizedBox(height: AppSpacing.xl),
                    const EntryLinksPanel(maxItems: 6),
                  ],
                  const SizedBox(height: AppSpacing.xl),
                  PanelSectionCard(
                    title: 'منابع ورودی',
                    icon: Icons.hub_rounded,
                    child: data.sources.isEmpty
                        ? const Text('داده‌ای موجود نیست.', style: TextStyle(color: AppColors.textMuted))
                        : _BarList(
                            items: data.sources.map((s) => (label: s.displayLabel, value: s.joins)).toList(),
                            color: AppColors.primary,
                          ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  PanelSectionCard(
                    title: 'رویدادهای ورودی',
                    icon: Icons.event_rounded,
                    child: data.entryEvents.isEmpty
                        ? const Text('داده‌ای موجود نیست.', style: TextStyle(color: AppColors.textMuted))
                        : _BarList(
                            items: data.entryEvents.map((e) => (label: e.name, value: e.joins)).toList(),
                            color: AppColors.info,
                          ),
                  ),
                ],
              );
            },
          ),
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

class _BarList extends StatelessWidget {
  const _BarList({required this.items, required this.color});

  final List<({String label, int value})> items;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final max = items.map((e) => e.value).fold<int>(1, (a, b) => a > b ? a : b);

    return Column(
      children: items.take(8).map((item) {
        final ratio = item.value / max;
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      item.label,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    toFaDigits(item.value.toString()),
                    style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 13),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.tile),
                child: LinearProgressIndicator(
                  value: ratio.clamp(0, 1),
                  minHeight: 10,
                  backgroundColor: AppColors.border.withValues(alpha: 0.5),
                  color: color,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
