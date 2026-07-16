import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/families/family_detail_screen.dart';
import 'package:bahram_family_manager/features/families/family_members_screen.dart';
import 'package:bahram_family_manager/features/families/family_editor_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class FamiliesScreen extends StatefulWidget {
  const FamiliesScreen({super.key});

  @override
  State<FamiliesScreen> createState() => _FamiliesScreenState();
}

class _FamiliesScreenState extends State<FamiliesScreen> {
  final _searchCtrl = TextEditingController();
  String? _lifecycle;
  int? _selectedFamilyId;
  Future<PaginatedResult<FamilySummaryModel>>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _future = context.read<AppState>().manager.listFamilies(search: _searchCtrl.text, lifecycle: _lifecycle);
    });
    await _future;
  }

  void _selectFamily(int id) {
    setState(() => _selectedFamilyId = id);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _createFamily() async {
    final created = await showFamilyEditorSheet(context: context);
    if (created == true) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);
    final canManage = context.watch<AppState>().user?.can('family.families.manage') ?? false;

    final Widget body;
    if (isDesktop) {
      body = AdaptiveScaffold(
        appBar: ManagerAppBar(
          title: const Text('خانواده‌ها'),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              tooltip: 'اعضای کانال',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const FamilyMembersScreen()),
              ),
              icon: const Icon(Icons.people_rounded),
            ),
            if (canManage)
              IconButton(
                tooltip: 'خانواده جدید',
                onPressed: _createFamily,
                icon: const Icon(Icons.add_rounded),
              ),
          ],
        ),
        body: Row(
          children: [
            SizedBox(
              width: 360,
              child: Column(
                children: [
                  _SearchHeader(
                    searchCtrl: _searchCtrl,
                    lifecycle: _lifecycle,
                    onSearch: _load,
                    onLifecycleChanged: (v) => setState(() {
                      _lifecycle = v;
                      _load();
                    }),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: _FamiliesList(
                      future: _future,
                      selectedId: _selectedFamilyId,
                      onRefresh: _load,
                      onSelect: _selectFamily,
                      desktopStyle: true,
                    ),
                  ),
                ],
              ),
            ),
            const VerticalDivider(width: 1, thickness: 1),
            Expanded(
              child: _selectedFamilyId == null
                  ? const EmptyState(
                      icon: Icons.touch_app_rounded,
                      title: 'یک خانواده انتخاب کنید',
                      subtitle: 'از لیست سمت راست، خانواده مورد نظر را انتخاب کنید.',
                    )
                  : FamilyDetailBody(
                      key: ValueKey(_selectedFamilyId),
                      familyId: _selectedFamilyId!,
                      onChanged: _load,
                    ),
            ),
          ],
        ),
      );
    } else {
      body = AdaptiveScaffold(
        appBar: ManagerAppBar(
          title: const Text('خانواده‌ها'),
          actions: [
            IconButton(
              tooltip: 'اعضای کانال',
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const FamilyMembersScreen()),
              ),
              icon: const Icon(Icons.people_rounded),
            ),
          ],
        ),
        body: Column(
          children: [
            _SearchHeader(
              searchCtrl: _searchCtrl,
              lifecycle: _lifecycle,
              onSearch: _load,
              onLifecycleChanged: (v) => setState(() {
                _lifecycle = v;
                _load();
              }),
            ),
            Expanded(
              child: _FamiliesList(
                future: _future,
                selectedId: _selectedFamilyId,
                onRefresh: _load,
                onSelect: (id) => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => FamilyDetailScreen(familyId: id)),
                ),
                desktopStyle: false,
              ),
            ),
          ],
        ),
      );
    }

    if (!canManage || isDesktop) return body;

    return Scaffold(
      body: body,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createFamily,
        icon: const Icon(Icons.add_rounded),
        label: const Text('خانواده جدید'),
      ),
    );
  }
}

class _SearchHeader extends StatelessWidget {
  const _SearchHeader({
    required this.searchCtrl,
    required this.lifecycle,
    required this.onSearch,
    required this.onLifecycleChanged,
  });

  final TextEditingController searchCtrl;
  final String? lifecycle;
  final VoidCallback onSearch;
  final ValueChanged<String?> onLifecycleChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: AppBreakpoints.pagePadding(context).copyWith(bottom: AppSpacing.sm),
      child: Column(
        children: [
          TextField(
            controller: searchCtrl,
            decoration: const InputDecoration(
              labelText: 'جستجو بر اساس نام داخلی',
              prefixIcon: Icon(Icons.search_rounded),
              isDense: true,
            ),
            onSubmitted: (_) => onSearch(),
          ),
          const SizedBox(height: AppSpacing.md),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _LifecycleChip(label: 'همه', selected: lifecycle == null, onTap: () => onLifecycleChanged(null)),
                ...lifecycleLabels.entries.map(
                  (e) => Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: _LifecycleChip(
                      label: e.value,
                      selected: lifecycle == e.key,
                      onTap: () => onLifecycleChanged(e.key),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FamiliesList extends StatelessWidget {
  const _FamiliesList({
    required this.future,
    required this.selectedId,
    required this.onRefresh,
    required this.onSelect,
    required this.desktopStyle,
  });

  final Future<PaginatedResult<FamilySummaryModel>>? future;
  final int? selectedId;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onSelect;
  final bool desktopStyle;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: FutureBuilder<PaginatedResult<FamilySummaryModel>>(
        future: future,
        builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilySummaryModel>>(
          snapshot: snapshot,
          emptyMessage: 'خانواده‌ای یافت نشد.',
          builder: (context, data) {
            final families = data.items;
            if (desktopStyle && selectedId == null && families.isNotEmpty) {
              WidgetsBinding.instance.addPostFrameCallback((_) => onSelect(families.first.id));
            }
            if (families.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [EmptyState(title: 'خانواده‌ای یافت نشد', icon: Icons.groups_outlined)],
              );
            }

            if (desktopStyle) {
              return ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: families.length,
                itemBuilder: (context, index) {
                  final f = families[index];
                  return _DesktopFamilyTile(
                    family: f,
                    selected: f.id == selectedId,
                    onTap: () => onSelect(f.id),
                  );
                },
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: families.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final f = families[index];
                return _MobileFamilyCard(family: f, onTap: () => onSelect(f.id));
              },
            );
          },
        ),
      ),
    );
  }
}

class _DesktopFamilyTile extends StatelessWidget {
  const _DesktopFamilyTile({
    required this.family,
    required this.selected,
    required this.onTap,
  });

  final FamilySummaryModel family;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fill = family.capacityTarget > 0 ? (family.memberCount / family.capacityTarget).clamp(0, 1.0) : 0.0;

    return Material(
      color: selected ? AppColors.primarySoft : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.6)),
              right: selected
                  ? const BorderSide(color: AppColors.primary, width: 3)
                  : BorderSide.none,
            ),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.primarySoft,
                child: Text(
                  family.internalName.isNotEmpty ? family.internalName.substring(0, 1) : 'خ',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      family.internalName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: selected ? AppColors.primaryDark : AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${toFaDigits(family.memberCount.toString())} / ${toFaDigits(family.capacityTarget.toString())} عضو',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 36,
                height: 36,
                child: CircularProgressIndicator(
                  value: fill.toDouble(),
                  backgroundColor: AppColors.border,
                  color: fill >= 1 ? AppColors.warning : AppColors.primary,
                  strokeWidth: 4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MobileFamilyCard extends StatelessWidget {
  const _MobileFamilyCard({required this.family, required this.onTap});

  final FamilySummaryModel family;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fill = family.capacityTarget > 0 ? (family.memberCount / family.capacityTarget).clamp(0, 1.5) : 0.0;

    return GlassPanel(
      borderRadius: 16,
      blur: 20,
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primarySoft,
                child: Text(
                  family.internalName.isNotEmpty ? family.internalName.substring(0, 1) : 'خ',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(family.internalName, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(
                      '${toFaDigits(family.memberCount.toString())} / ${toFaDigits(family.capacityTarget.toString())} عضو',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    StatusChip(
                      label: labelOf(lifecycleLabels, family.lifecycle),
                      color: AppColors.accent,
                      icon: Icons.circle_rounded,
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 44,
                height: 44,
                child: CircularProgressIndicator(
                  value: fill.toDouble().clamp(0, 1),
                  backgroundColor: AppColors.border,
                  color: fill >= 1 ? AppColors.warning : AppColors.primary,
                  strokeWidth: 5,
                ),
              ),
            ],
      ),
    );
  }
}

class _LifecycleChip extends StatelessWidget {
  const _LifecycleChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      selectedColor: AppColors.primarySoft,
      labelStyle: TextStyle(
        color: selected ? AppColors.primary : AppColors.textMuted,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
      ),
    );
  }
}
