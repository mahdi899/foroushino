import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/entry_links/entry_links_panel.dart';
import 'package:bahram_family_manager/features/families/family_detail_cache.dart';
import 'package:bahram_family_manager/features/families/family_editor_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/features/families/widgets/family_members_panel.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';

class FamilyDetailScreen extends StatelessWidget {
  const FamilyDetailScreen({super.key, required this.familyId});

  final int familyId;

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('جزئیات خانواده')),
      body: FamilyDetailBody(familyId: familyId),
    );
  }
}

/// Embeddable family detail — used in master-detail desktop layout and full-screen mobile.
class FamilyDetailBody extends StatefulWidget {
  const FamilyDetailBody({
    super.key,
    required this.familyId,
    this.onChanged,
  });

  final int familyId;
  final VoidCallback? onChanged;

  @override
  State<FamilyDetailBody> createState() => _FamilyDetailBodyState();
}

class _FamilyDetailBodyState extends State<FamilyDetailBody> {
  Future<FamilyDetailModel>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant FamilyDetailBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.familyId != widget.familyId) _load();
  }

  void _load() {
    setState(() {
      _future = FamilyDetailCache.load(
        widget.familyId,
        () => context.read<AppState>().manager.showFamily(widget.familyId),
      );
    });
  }

  Future<void> _edit(FamilyDetailModel family) async {
    final saved = await showFamilyEditorSheet(context: context, family: family);
    if (saved == true) {
      FamilyDetailCache.invalidate(family.id);
      _load();
      widget.onChanged?.call();
    }
  }

  Future<void> _delete(FamilyDetailModel family) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('حذف خانواده'),
        content: Text(
          family.memberCount > 0
              ? 'این خانواده ${toFaDigits(family.memberCount.toString())} عضو دارد و قابل حذف نیست.'
              : 'خانواده «${family.internalName}» حذف شود؟ این عمل قابل بازگشت نیست.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
          if (family.memberCount == 0)
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('حذف', style: TextStyle(color: AppColors.error)),
            ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await context.read<AppState>().manager.deleteFamily(family.id);
      if (!mounted) return;
      FamilyDetailCache.invalidate(family.id);
      showAppSnackBar(context, 'خانواده حذف شد.');
      widget.onChanged?.call();
      if (Navigator.canPop(context)) Navigator.pop(context);
    } on ApiException catch (e) {
      if (!mounted) return;
      showAppSnackBar(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canManage = context.read<AppState>().user?.can('family.families.manage') ?? false;
    final canManageLinks = context.read<AppState>().user?.can('family.entry_links.manage') ?? false;

    return FutureBuilder<FamilyDetailModel>(
      future: _future,
      builder: (context, snapshot) => SizedBox.expand(
        child: AsyncBody<FamilyDetailModel>(
          snapshot: snapshot,
          builder: (context, family) => _FamilyDetailTabs(
            family: family,
            canManage: canManage,
            canManageLinks: canManageLinks,
            onEdit: () => _edit(family),
            onDelete: () => _delete(family),
          ),
        ),
      ),
    );
  }
}

class _FamilyDetailTabs extends StatefulWidget {
  const _FamilyDetailTabs({
    required this.family,
    required this.canManage,
    required this.canManageLinks,
    required this.onEdit,
    required this.onDelete,
  });

  final FamilyDetailModel family;
  final bool canManage;
  final bool canManageLinks;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  State<_FamilyDetailTabs> createState() => _FamilyDetailTabsState();
}

class _FamilyDetailTabsState extends State<_FamilyDetailTabs> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  var _entryLinksEnabled = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this, initialIndex: 1);
    _tabController.addListener(_onTabChanged);
  }

  @override
  void didUpdateWidget(covariant _FamilyDetailTabs oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.family.id != widget.family.id) {
      _entryLinksEnabled = false;
      if (_tabController.index != 1) {
        _tabController.index = 1;
      }
    }
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    final onSummary = _tabController.index == 0;
    if (onSummary && !_entryLinksEnabled) {
      setState(() => _entryLinksEnabled = true);
    } else {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);
    final padding = AppBreakpoints.pagePadding(context);

    return SizedBox.expand(
      child: Padding(
        padding: isDesktop ? padding : EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: isDesktop ? EdgeInsets.zero : padding.copyWith(bottom: 0),
              child: TabBar(
                controller: _tabController,
                tabs: [
                  const Tab(text: 'خلاصه'),
                  Tab(text: 'اعضا (${toFaDigits(widget.family.memberCount.toString())})'),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  ListView(
                    padding: isDesktop ? EdgeInsets.zero : padding,
                    children: [
                      _FamilySummarySection(
                        family: widget.family,
                        canManage: widget.canManage,
                        isDesktop: isDesktop,
                        onEdit: widget.onEdit,
                        onDelete: widget.onDelete,
                      ),
                      SizedBox(height: isDesktop ? AppSpacing.xl : AppSpacing.lg),
                      widget.family.dna != null
                          ? _DnaCard(dna: widget.family.dna!)
                          : const AppCard(
                              child: Text(
                                'هنوز DNA خانواده محاسبه نشده.',
                                style: TextStyle(color: AppColors.textMuted),
                              ),
                            ),
                      if (widget.canManageLinks && _entryLinksEnabled) ...[
                        SizedBox(height: isDesktop ? AppSpacing.xl : AppSpacing.lg),
                        EntryLinksPanel(
                          key: ValueKey('links-${widget.family.id}'),
                          familyId: widget.family.id,
                          familyName: widget.family.internalName,
                          maxItems: 4,
                          showViewAll: true,
                        ),
                      ],
                    ],
                  ),
                  Padding(
                    padding: isDesktop ? EdgeInsets.zero : padding.copyWith(top: AppSpacing.sm),
                    child: SizedBox.expand(
                      child: FamilyMembersPanel(
                        key: ValueKey('members-${widget.family.id}'),
                        familyId: widget.family.id,
                        familyName: widget.family.internalName,
                        showAttribution: true,
                        canManageMembers: widget.canManage,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Legacy wrapper removed — content lives in _FamilyDetailTabs.
class FamilyDetailContent extends StatelessWidget {
  const FamilyDetailContent({
    super.key,
    required this.family,
    required this.canManage,
    required this.onEdit,
    required this.onDelete,
  });

  final FamilyDetailModel family;
  final bool canManage;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final canManageLinks = context.read<AppState>().user?.can('family.entry_links.manage') ?? false;
    return _FamilyDetailTabs(
      family: family,
      canManage: canManage,
      canManageLinks: canManageLinks,
      onEdit: onEdit,
      onDelete: onDelete,
    );
  }
}

class _FamilySummarySection extends StatelessWidget {
  const _FamilySummarySection({
    required this.family,
    required this.canManage,
    required this.isDesktop,
    required this.onEdit,
    required this.onDelete,
  });

  final FamilyDetailModel family;
  final bool canManage;
  final bool isDesktop;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: isDesktop ? 32 : 28,
              backgroundColor: AppColors.primarySoft,
              child: Text(
                family.internalName.isNotEmpty ? family.internalName.substring(0, 1) : 'خ',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                  fontSize: isDesktop ? 24 : 22,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(family.internalName, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: AppSpacing.xs),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.xs,
                    children: [
                      StatusChip(
                        label: labelOf(lifecycleLabels, family.lifecycle),
                        color: AppColors.primary,
                        icon: Icons.groups_rounded,
                      ),
                      StatusChip(
                        label: family.acceptingMembers ? 'پذیرش عضو' : 'بسته برای عضوگیری',
                        color: family.acceptingMembers ? AppColors.success : AppColors.warning,
                        icon: family.acceptingMembers ? Icons.person_add_alt_1_rounded : Icons.block_rounded,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (canManage) ...[
              IconButton(tooltip: 'ویرایش', onPressed: onEdit, icon: const Icon(Icons.edit_rounded)),
              IconButton(
                tooltip: 'حذف',
                onPressed: onDelete,
                icon: Icon(Icons.delete_outline_rounded, color: family.memberCount > 0 ? AppColors.textMuted : AppColors.error),
              ),
            ],
          ],
        ),
        if (family.profile.description != null && family.profile.description!.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('پروفایل خانواده', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: AppSpacing.sm),
                Text(family.profile.description!, style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
        if (family.profile.notes != null && family.profile.notes!.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('یادداشت مدیر', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: AppSpacing.sm),
                Text(family.profile.notes!, style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 600 ? 3 : 1;
            if (columns == 1) {
              return Column(
                children: [
                  _StatTile(title: 'اعضا', value: toFaDigits(family.memberCount.toString())),
                  const SizedBox(height: AppSpacing.sm),
                  _StatTile(title: 'ظرفیت هدف', value: toFaDigits(family.capacityTarget.toString())),
                  const SizedBox(height: AppSpacing.sm),
                  _StatTile(title: 'عضو جدید (۷ روز)', value: toFaDigits(family.newMembers7d.toString())),
                ],
              );
            }
            return Row(
              children: [
                Expanded(child: _StatTile(title: 'اعضا', value: toFaDigits(family.memberCount.toString()))),
                const SizedBox(width: AppSpacing.md),
                Expanded(child: _StatTile(title: 'ظرفیت هدف', value: toFaDigits(family.capacityTarget.toString()))),
                const SizedBox(width: AppSpacing.md),
                Expanded(child: _StatTile(title: 'عضو جدید (۷ روز)', value: toFaDigits(family.newMembers7d.toString()))),
              ],
            );
          },
        ),
        if (family.primarySource != null || family.entryEvent != null) ...[
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('تخصیص اولیه', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: AppSpacing.sm),
                if (family.primarySource != null)
                  Text('منبع: ${labelOf(entrySourceLabels, family.primarySource!)}'),
                if (family.entryEvent != null)
                  Text('رویداد: ${family.entryEvent!.name}${family.entryEvent!.externalReference == null ? '' : ' (${family.entryEvent!.externalReference})'}'),
              ],
            ),
          ),
        ],
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
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary)),
          const SizedBox(height: AppSpacing.xs),
          Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _DnaCard extends StatelessWidget {
  const _DnaCard({required this.dna});

  final FamilyDnaModel dna;

  static const _colors = [AppColors.primary, AppColors.accent, AppColors.gold, AppColors.info, AppColors.success, AppColors.warning];

  @override
  Widget build(BuildContext context) {
    final rows = <(String, double)>[
      ('تعامل صوتی', dna.voiceEngagement),
      ('تعامل ویدیویی', dna.videoEngagement),
      ('نرخ واکنش', dna.reactionRate),
      ('نرخ کامنت', dna.commentRate),
      ('تعهد به اکشن', dna.actionCommitment),
      ('تکمیل اکشن', dna.actionCompletion),
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('DNA خانواده (۷ روز اخیر)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: AppSpacing.lg),
          ...rows.asMap().entries.map(
                (entry) {
                  final color = _colors[entry.key % _colors.length];
                  final r = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(r.$1),
                            Text(faPercent(r.$2 * 100), style: TextStyle(fontWeight: FontWeight.w700, color: color)),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.tile),
                          child: LinearProgressIndicator(
                            value: r.$2.clamp(0, 1),
                            minHeight: 8,
                            backgroundColor: AppColors.border,
                            color: color,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
        ],
      ),
    );
  }
}
