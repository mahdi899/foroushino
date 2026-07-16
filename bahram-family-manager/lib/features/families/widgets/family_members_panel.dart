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
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
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
      _loadFirstPage();
    }
  }

  Future<void> _removeMember(FamilyMemberModel member) async {
    if (!_canManage) return;

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
    if (confirmed != true) return;

    try {
      await context.read<AppState>().manager.removeMember(
            familyId: widget.familyId!,
            membershipId: member.id,
          );
      if (mounted) {
        showAppSnackBar(context, 'عضو از خانواده حذف شد.');
        if (widget.familyId != null) FamilyMembersCache.invalidate(widget.familyId);
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  @override
  Widget build(BuildContext context) {
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
        TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'جستجو نام یا موبایل',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              onPressed: _loadFirstPage,
              icon: const Icon(Icons.refresh_rounded),
            ),
            isDense: widget.compact,
          ),
          onSubmitted: (_) => _loadFirstPage(),
        ),
        if (_canManage && widget.compact) ...[
          const SizedBox(height: AppSpacing.sm),
          PrimaryButton(
            label: 'افزودن عضو',
            icon: Icons.person_add_rounded,
            onPressed: _addMember,
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        Expanded(child: _buildMembersBody()),
      ],
    );
  }

  Widget _buildMembersBody() {
    if (_initialLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _members.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'خطا در بارگذاری اعضا',
            subtitle: _error!,
            actionLabel: 'تلاش مجدد',
            onAction: _loadFirstPage,
          ),
        ],
      );
    }

    if (_members.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            title: 'عضوی یافت نشد',
            subtitle: _canManage ? 'با دکمه افزودن، عضو جدید اضافه کنید.' : 'هنوز کسی به این خانواده نپیوسته.',
            icon: Icons.people_outline_rounded,
            actionLabel: _canManage ? 'افزودن عضو' : null,
            onAction: _canManage ? _addMember : null,
          ),
        ],
      );
    }

    return RefreshIndicator(
      onRefresh: _loadFirstPage,
      child: ListView.separated(
        controller: _scrollCtrl,
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _members.length + (_hasMore || _loadingMore ? 1 : 0),
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
            onRemove: () => _removeMember(member),
          );
        },
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({
    required this.member,
    required this.showFamilyName,
    required this.showAttribution,
    required this.canRemove,
    required this.onRemove,
  });

  final FamilyMemberModel member;
  final bool showFamilyName;
  final bool showAttribution;
  final bool canRemove;
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
    final initial = member.name?.isNotEmpty == true ? member.name!.substring(0, 1) : '؟';

    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surface.withValues(alpha: isDark ? 0.55 : 0.92),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
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
                Text(member.name ?? 'بدون نام', style: const TextStyle(fontWeight: FontWeight.w700)),
                if (_displayMobile != null)
                  Row(
                    children: [
                      Expanded(
                        child: SelectableText(
                          _displayMobile!,
                          style: TextStyle(
                            color: scheme.onSurface.withValues(alpha: 0.9),
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'کپی شماره',
                        visualDensity: VisualDensity.compact,
                        onPressed: () {
                          final raw = member.displayMobile;
                          if (raw == null) return;
                          Clipboard.setData(ClipboardData(text: raw));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('شماره کپی شد')),
                          );
                        },
                        icon: Icon(Icons.copy_rounded, size: 18, color: scheme.primary),
                      ),
                    ],
                  ),
                if (showFamilyName && member.familyName != null)
                  Text(member.familyName!, style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.55), fontSize: 12)),
                if (showAttribution && member.entrySource != null)
                  Text(
                    labelOf(entrySourceLabels, member.entrySource!),
                    style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                if (showAttribution && member.entryEventName != null)
                  Text(
                    member.entryEventName!,
                    style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 11),
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (member.joinedAt != null)
                Text(formatDateTime(member.joinedAt!), style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 11)),
              if (!showAttribution && member.entrySource != null)
                Text(
                  labelOf(entrySourceLabels, member.entrySource!),
                  style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                ),
            ],
          ),
          if (canRemove) ...[
            const SizedBox(width: AppSpacing.xs),
            IconButton(
              tooltip: 'حذف از خانواده',
              onPressed: onRemove,
              icon: const Icon(Icons.person_remove_rounded, color: AppColors.error),
            ),
          ],
        ),
      ),
    );
  }
}
