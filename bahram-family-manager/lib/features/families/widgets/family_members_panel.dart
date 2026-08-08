import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/paginated_scroll.dart';
import 'package:bahram_family_manager/features/families/family_members_cache.dart';
import 'package:bahram_family_manager/features/families/widgets/add_family_member_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';

class FamilyMembersPanel extends StatefulWidget {
  const FamilyMembersPanel({
    super.key,
    this.familyId,
    this.familyName,
    this.title,
    this.entryEventId,
    this.entryLinkId,
    this.entrySource,
    this.showFamilyName = false,
    this.showAttribution = false,
    this.compact = false,
    this.canManageMembers = false,
    this.onMembersChanged,
  });

  final int? familyId;
  final String? familyName;
  final String? title;
  final int? entryEventId;
  final int? entryLinkId;
  final String? entrySource;
  final bool showFamilyName;
  final bool showAttribution;
  final bool compact;
  final bool canManageMembers;
  final VoidCallback? onMembersChanged;

  @override
  State<FamilyMembersPanel> createState() => _FamilyMembersPanelState();
}

class _FamilyMembersPanelState extends State<FamilyMembersPanel> {
  static const _pageSize = 25;

  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _members = <FamilyMemberModel>[];

  var _page = 0;
  var _hasMore = true;
  var _total = 0;
  var _initialLoading = true;
  var _loadingMore = false;
  String? _error;
  int? _removingMemberId;

  bool get _canManage => widget.canManageMembers && widget.familyId != null;

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadFirstPage();
    });
  }

  @override
  void didUpdateWidget(covariant FamilyMembersPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.familyId != widget.familyId ||
        oldWidget.showFamilyName != widget.showFamilyName ||
        oldWidget.entryEventId != widget.entryEventId ||
        oldWidget.entryLinkId != widget.entryLinkId ||
        oldWidget.entrySource != widget.entrySource) {
      _loadFirstPage();
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _initialLoading) return;
    final position = _scrollCtrl.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  String? get _searchQuery {
    final q = _searchCtrl.text.trim();
    return q.isEmpty ? null : q;
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _initialLoading = true;
      _loadingMore = false;
      _error = null;
      _members.clear();
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
      final canUseCache = page == 1 &&
          replace &&
          widget.familyId != null &&
          _searchQuery == null &&
          widget.entryEventId == null &&
          widget.entryLinkId == null &&
          widget.entrySource == null;

      Future<PaginatedResult<FamilyMemberModel>> fetch() {
        return context.read<AppState>().manager.listMembers(
              familyId: widget.familyId,
              entryEventId: widget.entryEventId,
              entryLinkId: widget.entryLinkId,
              entrySource: widget.entrySource,
              search: _searchQuery,
              page: page,
              perPage: _pageSize,
            );
      }

      final result = canUseCache
          ? await FamilyMembersCache.load(widget.familyId!, fetch)
          : await fetch();
      if (!mounted) return;
      setState(() {
        if (replace) {
          _members
            ..clear()
            ..addAll(result.items);
        } else {
          _members.addAll(result.items);
        }
        _page = result.currentPage;
        _hasMore = result.hasMore;
        _total = result.total;
        _initialLoading = false;
        _loadingMore = false;
        _error = null;
      });
      schedulePaginatedPrefetch(
        controller: _scrollCtrl,
        mounted: mounted,
        hasMore: _hasMore,
        loadingMore: _loadingMore,
        initialLoading: _initialLoading,
        loadMore: _loadMore,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = messageOf(e);
        _initialLoading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _addMember() async {
    if (!_canManage) return;
    final added = await showAddFamilyMemberSheet(
      context: context,
      familyId: widget.familyId!,
      familyName: widget.familyName,
    );
    if (added == true) {
      if (widget.familyId != null) FamilyMembersCache.invalidate(widget.familyId);
      widget.onMembersChanged?.call();
      _loadFirstPage();
    }
  }

  Future<void> _removeMember(FamilyMemberModel member) async {
    if (!_canManage || _removingMemberId != null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('حذف عضو'),
        content: Text('${member.name ?? 'این عضو'} از خانواده حذف شود؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final manager = context.read<AppState>().manager;
    setState(() => _removingMemberId = member.id);
    try {
      await manager.removeMember(
            familyId: widget.familyId!,
            membershipId: member.id,
          );
      if (mounted) {
        showAppSnackBar(context, 'عضو از خانواده حذف شد.');
        if (widget.familyId != null) FamilyMembersCache.invalidate(widget.familyId);
        widget.onMembersChanged?.call();
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _removingMemberId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadFirstPage,
      child: CustomScrollView(
        controller: _scrollCtrl,
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _buildHeader(context)),
          ..._buildBodySlivers(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!widget.compact) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  widget.title ?? (widget.familyId == null ? 'اعضای کانال خانواده' : 'اعضای این خانواده'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
              ),
              if (_total > 0)
                Padding(
                  padding: const EdgeInsets.only(left: AppSpacing.sm),
                  child: Text(
                    toFaDigits(_total.toString()),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              if (_canManage) ...[
                const SizedBox(width: AppSpacing.sm),
                FilledButton.icon(
                  onPressed: _addMember,
                  icon: const Icon(Icons.person_add_rounded, size: 18),
                  label: const Text('افزودن'),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        if (_canManage && widget.compact) ...[
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: FilledButton.icon(
              onPressed: _addMember,
              icon: const Icon(Icons.person_add_rounded, size: 18),
              label: const Text('افزودن عضو'),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'جستجو نام یا موبایل',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              onPressed: _loadFirstPage,
              icon: const Icon(Icons.refresh_rounded),
            ),
            isDense: true,
          ),
          onSubmitted: (_) => _loadFirstPage(),
        ),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }

  List<Widget> _buildBodySlivers(BuildContext context) {
    if (_initialLoading) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }

    if (_error != null && _members.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'خطا در بارگذاری اعضا',
            subtitle: _error!,
            actionLabel: 'تلاش مجدد',
            onAction: _loadFirstPage,
          ),
        ),
      ];
    }

    if (_members.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: EmptyState(
            title: 'عضوی یافت نشد',
            subtitle: _canManage ? 'با دکمه افزودن، عضو جدید اضافه کنید.' : 'هنوز کسی به این خانواده نپیوسته.',
            icon: Icons.people_outline_rounded,
            actionLabel: _canManage ? 'افزودن عضو' : null,
            onAction: _canManage ? _addMember : null,
          ),
        ),
      ];
    }

    final itemCount = _members.length + (_hasMore || _loadingMore ? 1 : 0);

    return [
      SliverList.separated(
        itemCount: itemCount,
        separatorBuilder: (_, index) {
          if (index >= _members.length - 1) return const SizedBox.shrink();
          return const SizedBox(height: AppSpacing.sm);
        },
        itemBuilder: (context, index) {
          if (index >= _members.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final member = _members[index];
          return _MemberTile(
            member: member,
            showFamilyName: widget.showFamilyName,
            showAttribution: widget.showAttribution || widget.entryLinkId != null,
            canRemove: _canManage,
            removing: _removingMemberId == member.id,
            removeDisabled: _removingMemberId != null,
            onRemove: () => _removeMember(member),
          );
        },
      ),
      const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
    ];
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({
    required this.member,
    required this.showFamilyName,
    required this.showAttribution,
    required this.canRemove,
    required this.removing,
    required this.removeDisabled,
    required this.onRemove,
  });

  final FamilyMemberModel member;
  final bool showFamilyName;
  final bool showAttribution;
  final bool canRemove;
  final bool removing;
  final bool removeDisabled;
  final VoidCallback onRemove;

  String? get _displayMobile {
    final mobile = member.displayMobile;
    if (mobile == null || mobile.isEmpty) return null;
    return toFaDigits(mobile);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
    final muted = scheme.onSurface.withValues(alpha: 0.55);
    final initial = member.name?.isNotEmpty == true ? member.name!.substring(0, 1) : '؟';
    final sourceLabel = member.entrySource != null ? labelOf(entrySourceLabels, member.entrySource!) : null;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surface.withValues(alpha: isDark ? 0.55 : 0.92),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm + 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.primarySoft,
              child: Text(initial, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.name ?? 'بدون نام',
                    style: const TextStyle(fontWeight: FontWeight.w700, height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_displayMobile != null) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Flexible(
                          child: SelectableText(
                            _displayMobile!,
                            style: TextStyle(
                              color: scheme.onSurface.withValues(alpha: 0.9),
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                              height: 1.3,
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: 'کپی شماره',
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          onPressed: () {
                            final raw = member.displayMobile;
                            if (raw == null) return;
                            Clipboard.setData(ClipboardData(text: raw));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('شماره کپی شد')),
                            );
                          },
                          icon: Icon(Icons.copy_rounded, size: 16, color: scheme.primary),
                        ),
                      ],
                    ),
                  ],
                  if (showFamilyName && member.familyName != null) ...[
                    const SizedBox(height: 2),
                    Text(member.familyName!, style: TextStyle(color: muted, fontSize: 12)),
                  ],
                  if (member.joinedAt != null || sourceLabel != null) ...[
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (sourceLabel != null)
                          Text(
                            sourceLabel,
                            style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        if (member.joinedAt != null)
                          Text(
                            formatDateTime(member.joinedAt!),
                            style: TextStyle(color: muted, fontSize: 11),
                          ),
                      ],
                    ),
                  ],
                  if (showAttribution && member.entryEventName != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      member.entryEventName!,
                      style: TextStyle(color: muted, fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (canRemove)
              IconButton(
                tooltip: 'حذف از خانواده',
                visualDensity: VisualDensity.compact,
                onPressed: removeDisabled ? null : onRemove,
                icon: removing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.person_remove_rounded, color: AppColors.error),
              ),
          ],
        ),
      ),
    );
  }
}
