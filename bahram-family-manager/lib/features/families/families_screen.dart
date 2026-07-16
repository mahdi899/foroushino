import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/families/family_detail_cache.dart';
import 'package:bahram_family_manager/features/families/family_members_cache.dart';
import 'package:bahram_family_manager/features/families/family_detail_screen.dart';
import 'package:bahram_family_manager/features/families/family_members_screen.dart';
import 'package:bahram_family_manager/features/families/family_editor_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class FamiliesScreen extends StatefulWidget {
  const FamiliesScreen({super.key});

  @override
  State<FamiliesScreen> createState() => _FamiliesScreenState();
}

class _FamiliesScreenState extends State<FamiliesScreen> {
  static const _pageSize = 25;

  final _searchCtrl = TextEditingController();
  final _familiesScrollCtrl = ScrollController();
  String? _lifecycle;
  int? _selectedFamilyId;

  final _families = <FamilySummaryModel>[];
  var _familiesPage = 0;
  var _familiesHasMore = true;
  var _familiesTotal = 0;
  var _familiesInitialLoading = true;
  var _familiesLoadingMore = false;
  String? _familiesError;

  @override
  void initState() {
    super.initState();
    _familiesScrollCtrl.addListener(_onFamiliesScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadFamiliesFirstPage();
    });
  }

  void _onFamiliesScroll() {
    if (!_familiesHasMore || _familiesLoadingMore || _familiesInitialLoading) return;
    final position = _familiesScrollCtrl.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      _loadFamiliesMore();
    }
  }

  Future<void> _loadFamiliesFirstPage() async {
    setState(() {
      _familiesInitialLoading = true;
      _familiesLoadingMore = false;
      _familiesError = null;
      _families.clear();
      _familiesPage = 0;
      _familiesHasMore = true;
      _familiesTotal = 0;
    });
    await _fetchFamiliesPage(1, replace: true);
  }

  Future<void> _loadFamiliesMore() async {
    if (!_familiesHasMore || _familiesLoadingMore || _familiesInitialLoading) return;
    setState(() => _familiesLoadingMore = true);
    await _fetchFamiliesPage(_familiesPage + 1, replace: false);
  }

  Future<void> _fetchFamiliesPage(int page, {required bool replace}) async {
    try {
      final result = await context.read<AppState>().manager.listFamilies(
            search: _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
            lifecycle: _lifecycle,
            page: page,
            perPage: _pageSize,
          );
      if (!mounted) return;
      setState(() {
        if (replace) {
          _families
            ..clear()
            ..addAll(result.items);
          if (_selectedFamilyId != null &&
              !_families.any((family) => family.id == _selectedFamilyId)) {
            _selectedFamilyId = _families.isNotEmpty ? _families.first.id : null;
          }
        } else {
          _families.addAll(result.items);
        }
        _familiesPage = result.currentPage;
        _familiesHasMore = result.hasMore;
        _familiesTotal = result.total;
        _familiesInitialLoading = false;
        _familiesLoadingMore = false;
        _familiesError = null;
      });
      _maybeAutoSelectFirst();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _familiesError = messageOf(e);
        _familiesInitialLoading = false;
        _familiesLoadingMore = false;
      });
    }
  }

  void _selectFamily(int id) {
    setState(() => _selectedFamilyId = id);
  }

  void _maybeAutoSelectFirst() {
    if (!mounted || !AppBreakpoints.isDesktop(context)) return;
    if (_selectedFamilyId != null || _families.isEmpty) return;
    setState(() => _selectedFamilyId = _families.first.id);
  }

  FamilySummaryModel? _selectedFamilySummary() {
    final id = _selectedFamilyId;
    if (id == null) return null;
    for (final family in _families) {
      if (family.id == id) return family;
    }
    return null;
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _familiesScrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshFamiliesList() async {
    if (_familiesInitialLoading) {
      await _loadFamiliesFirstPage();
      return;
    }
    try {
      final result = await context.read<AppState>().manager.listFamilies(
            search: _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
            lifecycle: _lifecycle,
            page: 1,
            perPage: _pageSize,
          );
      if (!mounted) return;
      setState(() {
        _families
          ..clear()
          ..addAll(result.items);
        _familiesPage = result.currentPage;
        _familiesHasMore = result.hasMore;
        _familiesTotal = result.total;
        if (_selectedFamilyId != null && !_families.any((family) => family.id == _selectedFamilyId)) {
          _selectedFamilyId = _families.isNotEmpty ? _families.first.id : null;
        }
      });
    } catch (_) {}
  }

  Future<void> _createFamily() async {
    final created = await showFamilyEditorSheet(context: context);
    if (created == true) {
      context.read<AppState>().invalidateFamiliesCache();
      FamilyDetailCache.invalidate();
      FamilyMembersCache.invalidate();
      await _loadFamiliesFirstPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Selector<AppState, bool>(
      selector: (_, state) => state.user?.can('family.families.manage') ?? false,
      builder: (context, canManage, _) {
        final isDesktop = AppBreakpoints.isDesktop(context);
        return _buildBody(context, isDesktop: isDesktop, canManage: canManage);
      },
    );
  }

  Widget _buildBody(BuildContext context, {required bool isDesktop, required bool canManage}) {
    if (isDesktop) {
      return AdaptiveScaffold(
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
        body: SizedBox.expand(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _FamiliesListSidebar(
                searchCtrl: _searchCtrl,
                lifecycle: _lifecycle,
                onSearch: _loadFamiliesFirstPage,
                onLifecycleChanged: (v) => setState(() {
                  _lifecycle = v;
                  _loadFamiliesFirstPage();
                }),
                scrollController: _familiesScrollCtrl,
                families: _families,
                initialLoading: _familiesInitialLoading,
                loadingMore: _familiesLoadingMore,
                hasMore: _familiesHasMore,
                error: _familiesError,
                selectedId: _selectedFamilyId,
                onRefresh: _loadFamiliesFirstPage,
                onSelect: _selectFamily,
              ),
              VerticalDivider(width: 1, thickness: 1, color: Theme.of(context).dividerColor),
              Expanded(
                child: _selectedFamilyId == null
                    ? const EmptyState(
                        icon: Icons.touch_app_rounded,
                        title: 'یک خانواده انتخاب کنید',
                        subtitle: 'از لیست سمت راست، خانواده مورد نظر را انتخاب کنید.',
                      )
                    : FamilyDetailBody(
                        familyId: _selectedFamilyId!,
                        familySummary: _selectedFamilySummary(),
                        onChanged: _refreshFamiliesList,
                      ),
              ),
            ],
          ),
        ),
      );
    }

    return AdaptiveScaffold(
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
        floatingActionButton: canManage
            ? FloatingActionButton.extended(
                onPressed: _createFamily,
                icon: const Icon(Icons.add_rounded),
                label: const Text('خانواده جدید'),
              )
            : null,
        body: Column(
          children: [
            _SearchHeader(
              searchCtrl: _searchCtrl,
              lifecycle: _lifecycle,
              onSearch: _loadFamiliesFirstPage,
              onLifecycleChanged: (v) => setState(() {
                _lifecycle = v;
                _loadFamiliesFirstPage();
              }),
            ),
            Expanded(
              child: _FamiliesList(
                scrollController: _familiesScrollCtrl,
                families: _families,
                initialLoading: _familiesInitialLoading,
                loadingMore: _familiesLoadingMore,
                hasMore: _familiesHasMore,
                error: _familiesError,
                selectedId: _selectedFamilyId,
                onRefresh: _loadFamiliesFirstPage,
                onSelect: (id) {
                  FamilySummaryModel? summary;
                  for (final family in _families) {
                    if (family.id == id) {
                      summary = family;
                      break;
                    }
                  }
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => FamilyDetailScreen(familyId: id, familySummary: summary),
                    ),
                  );
                },
                desktopStyle: false,
              ),
            ),
          ],
      ),
    );
  }
}

class _FamiliesListSidebar extends StatelessWidget {
  const _FamiliesListSidebar({
    required this.searchCtrl,
    required this.lifecycle,
    required this.onSearch,
    required this.onLifecycleChanged,
    required this.scrollController,
    required this.families,
    required this.initialLoading,
    required this.loadingMore,
    required this.hasMore,
    required this.error,
    required this.selectedId,
    required this.onRefresh,
    required this.onSelect,
  });

  static const _width = 360.0;

  final TextEditingController searchCtrl;
  final String? lifecycle;
  final VoidCallback onSearch;
  final ValueChanged<String?> onLifecycleChanged;
  final ScrollController scrollController;
  final List<FamilySummaryModel> families;
  final bool initialLoading;
  final bool loadingMore;
  final bool hasMore;
  final String? error;
  final int? selectedId;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    return SizedBox(
      width: _width,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: context.appSurfaceSoft.withValues(alpha: isDark ? 0.78 : 0.96),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SearchHeader(
              searchCtrl: searchCtrl,
              lifecycle: lifecycle,
              onSearch: onSearch,
              onLifecycleChanged: onLifecycleChanged,
            ),
            Divider(height: 1, thickness: 1, color: scheme.outline.withValues(alpha: 0.65)),
            Expanded(
              child: _FamiliesList(
                scrollController: scrollController,
                families: families,
                initialLoading: initialLoading,
                loadingMore: loadingMore,
                hasMore: hasMore,
                error: error,
                selectedId: selectedId,
                onRefresh: onRefresh,
                onSelect: onSelect,
                desktopStyle: true,
              ),
            ),
          ],
        ),
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
    required this.scrollController,
    required this.families,
    required this.initialLoading,
    required this.loadingMore,
    required this.hasMore,
    required this.error,
    required this.selectedId,
    required this.onRefresh,
    required this.onSelect,
    required this.desktopStyle,
  });

  final ScrollController scrollController;
  final List<FamilySummaryModel> families;
  final bool initialLoading;
  final bool loadingMore;
  final bool hasMore;
  final String? error;
  final int? selectedId;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onSelect;
  final bool desktopStyle;

  @override
  Widget build(BuildContext context) {
    if (initialLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (error != null && families.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'خطا در بارگذاری خانواده‌ها',
            subtitle: error!,
            actionLabel: 'تلاش مجدد',
            onAction: onRefresh,
          ),
        ],
      );
    }

    if (families.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [EmptyState(title: 'خانواده‌ای یافت نشد', icon: Icons.groups_outlined)],
        ),
      );
    }

    final itemCount = families.length + (hasMore || loadingMore ? 1 : 0);

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: desktopStyle
          ? ListView.builder(
              controller: scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: itemCount,
              itemBuilder: (context, index) {
                if (index >= families.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final f = families[index];
                return RepaintBoundary(
                  child: _DesktopFamilyTile(
                    family: f,
                    selected: f.id == selectedId,
                    onTap: () => onSelect(f.id),
                  ),
                );
              },
            )
          : ListView.separated(
              controller: scrollController,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: itemCount,
              separatorBuilder: (_, index) {
                if (index >= families.length - 1) return const SizedBox.shrink();
                return const SizedBox(height: AppSpacing.sm);
              },
              itemBuilder: (context, index) {
                if (index >= families.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final f = families[index];
                return _MobileFamilyCard(family: f, onTap: () => onSelect(f.id));
              },
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
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: fill.toDouble(),
                    minHeight: 6,
                    backgroundColor: AppColors.border,
                    color: fill >= 1 ? AppColors.warning : AppColors.primary,
                  ),
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
      blur: 0,
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
