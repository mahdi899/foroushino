import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/families/family_editor_sheet.dart';
import 'package:bahram_family_manager/features/families/widgets/family_single_picker_sheet.dart';
import 'package:bahram_family_manager/features/landing_leads/landing_lead_card.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class LandingLeadsScreen extends StatefulWidget {
  const LandingLeadsScreen({super.key});

  @override
  State<LandingLeadsScreen> createState() => _LandingLeadsScreenState();
}

class _LandingLeadsScreenState extends State<LandingLeadsScreen> {
  static const _pageSize = 25;

  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  final _leads = <LandingLeadModel>[];
  List<LandingPageOptionModel> _landingPages = [];

  var _page = 0;
  var _hasMore = true;
  var _total = 0;
  var _initialLoading = true;
  var _loadingMore = false;
  var _unassignedOnly = true;
  int? _landingPageId;
  String? _error;

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _bootstrap();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final pages = await context.read<AppState>().manager.listLandingPagesForLeads();
      if (!mounted) return;
      setState(() => _landingPages = pages);
    } catch (_) {}
    await _loadFirstPage();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _initialLoading) return;
    final position = _scrollCtrl.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _initialLoading = true;
      _loadingMore = false;
      _error = null;
      _leads.clear();
      _page = 0;
      _hasMore = true;
      _total = 0;
    });
    await _fetchPage(1, replace: true);
  }

  Future<void> _loadMore() async {
    if (!_hasMore || _loadingMore || _initialLoading) return;
    setState(() => _loadingMore = true);
    await _fetchPage(_page + 1, replace: false);
  }

  Future<void> _fetchPage(int page, {required bool replace}) async {
    try {
      final result = await context.read<AppState>().manager.listLandingLeads(
            unassignedOnly: _unassignedOnly,
            landingPageId: _landingPageId,
            search: _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
            page: page,
            perPage: _pageSize,
          );
      if (!mounted) return;
      setState(() {
        if (replace) {
          _leads
            ..clear()
            ..addAll(result.items);
        } else {
          _leads.addAll(result.items);
        }
        _page = result.currentPage;
        _hasMore = result.hasMore;
        _total = result.total;
        _initialLoading = false;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = messageOf(e);
        _initialLoading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _assignToFamily(LandingLeadModel lead) async {
    final familyId = await showFamilySinglePickerSheet(context);
    if (!mounted || familyId == null) return;

    try {
      await context.read<AppState>().manager.assignLandingLead(
            leadId: lead.id,
            familyId: familyId,
          );
      if (!mounted) return;
      showAppSnackBar(context, 'ثبت‌نام به خانواده اضافه شد.');
      await _loadFirstPage();
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _createFamilyForLead(LandingLeadModel lead) async {
    final familyId = await showFamilyEditorSheet(
      context: context,
      initialName: lead.name != '—' ? lead.name : null,
      initialPrimarySource: 'landings',
    );
    if (!mounted || familyId == null) return;

    try {
      await context.read<AppState>().manager.assignLandingLead(
            leadId: lead.id,
            familyId: familyId,
          );
      if (!mounted) return;
      showAppSnackBar(context, 'خانواده ساخته شد و ثبت‌نام اضافه شد.');
      context.read<AppState>().invalidateFamiliesCache();
      await _loadFirstPage();
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final canManage = context.watch<AppState>().user?.can('family.families.manage') ?? false;

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: const Text('ثبت‌نام‌های لندینگ'),
        actions: [
          IconButton(
            tooltip: 'بروزرسانی',
            onPressed: _loadFirstPage,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: AppBreakpoints.pagePadding(context).copyWith(bottom: AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    labelText: 'جستجو (نام یا موبایل)',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            onPressed: () {
                              _searchCtrl.clear();
                              _loadFirstPage();
                            },
                            icon: const Icon(Icons.clear_rounded),
                          )
                        : null,
                    isDense: true,
                  ),
                  onSubmitted: (_) => _loadFirstPage(),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int?>(
                        value: _landingPageId,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          labelText: 'لندینگ',
                          isDense: true,
                        ),
                        items: [
                          const DropdownMenuItem<int?>(value: null, child: Text('همه لندینگ‌ها')),
                          ..._landingPages.map(
                            (p) => DropdownMenuItem<int?>(
                              value: p.id,
                              child: Text(
                                p.unassignedCount > 0
                                    ? '${p.title} (${toFaDigits(p.unassignedCount.toString())})'
                                    : p.title,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ],
                        onChanged: (v) {
                          setState(() => _landingPageId = v);
                          _loadFirstPage();
                        },
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    FilterChip(
                      label: const Text('فقط تخصیص‌نشده'),
                      selected: _unassignedOnly,
                      onSelected: (v) {
                        setState(() => _unassignedOnly = v);
                        _loadFirstPage();
                      },
                    ),
                  ],
                ),
                if (_total > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.sm),
                    child: Text(
                      '${toFaDigits(_total.toString())} ثبت‌نام',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadFirstPage,
              child: _buildList(canManage),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(bool canManage) {
    if (_initialLoading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 120),
          Center(child: CircularProgressIndicator()),
        ],
      );
    }

    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'بارگذاری ناموفق',
            subtitle: _error!,
            actionLabel: 'تلاش مجدد',
            onAction: _loadFirstPage,
          ),
        ],
      );
    }

    if (_leads.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            icon: Icons.person_add_alt_1_rounded,
            title: 'ثبت‌نامی نیست',
            subtitle: 'فرم‌های لندینگ سایت هنوز کسی ثبت نکرده، یا همه به خانواده اختصاص داده شده‌اند.',
          ),
        ],
      );
    }

    return ListView.separated(
      controller: _scrollCtrl,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppBreakpoints.scrollPadding(context),
      itemCount: _leads.length + (_loadingMore ? 1 : 0),
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        if (index >= _leads.length) {
          return const Padding(
            padding: EdgeInsets.all(AppSpacing.lg),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final lead = _leads[index];
        return LandingLeadCard(
          lead: lead,
          canManage: canManage && !lead.isAssigned,
          statusLabel: lead.statusLabel ?? leadStatusLabel(lead.status ?? 'new'),
          onCreateFamily: () => _createFamilyForLead(lead),
          onAddToFamily: () => _assignToFamily(lead),
        );
      },
    );
  }
}
