import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/paginated_scroll.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/comments/comment_card.dart';
import 'package:bahram_family_manager/widgets/comments/reply_sheet.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class _CommentsTabData {
  final items = <FamilyCommentModel>[];
  var page = 0;
  var hasMore = true;
  var initialLoading = false;
  var loadingMore = false;
  String? error;
}

/// Per-post (× family) comment moderation detail.
class PostCommentsScreen extends StatefulWidget {
  const PostCommentsScreen({
    super.key,
    required this.thread,
    this.initialTab = 'pending',
    this.initialSearch,
  });

  final CommentThreadModel thread;
  final String initialTab;
  final String? initialSearch;

  @override
  State<PostCommentsScreen> createState() => _PostCommentsScreenState();
}

class _PostCommentsScreenState extends State<PostCommentsScreen> with SingleTickerProviderStateMixin {
  static const _tabs = ['pending', 'approved', 'rejected', 'important', 'unread', 'coaching_questions'];
  static const _tabLabels = {
    'pending': 'در انتظار',
    'approved': 'تأییدشده',
    'rejected': 'رد‌شده',
    'important': 'مهم',
    'unread': 'خوانده‌نشده',
    'coaching_questions': 'سؤال کوچینگ',
  };

  late final TabController _tabController;
  final _scrollCtrl = ScrollController();
  final _searchCtrl = TextEditingController();
  final _tabData = List.generate(_tabs.length, (_) => _CommentsTabData());
  final Set<int> _selectedPendingIds = {};
  /// comment/reply id → which moderation action is in flight.
  final Map<int, CommentBusyAction> _busyActions = {};
  var _batchApproving = false;

  _CommentsTabData get _currentTab => _tabData[_tabController.index];

  String? get _searchQuery {
    final q = _searchCtrl.text.trim();
    return q.isEmpty ? null : q;
  }

  @override
  void initState() {
    super.initState();
    final initial = _tabs.indexOf(widget.initialTab);
    final seed = widget.initialSearch?.trim();
    if (seed != null && seed.isNotEmpty) {
      _searchCtrl.text = seed;
    }
    _tabController = TabController(
      length: _tabs.length,
      vsync: this,
      initialIndex: initial >= 0 ? initial : 0,
    )..addListener(_onTabChanged);
    _scrollCtrl.addListener(_onScroll);
    _searchCtrl.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadFirstPage();
    });
  }

  void _onScroll() {
    final tab = _currentTab;
    if (!tab.hasMore || tab.loadingMore || tab.initialLoading) return;
    final position = _scrollCtrl.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      setState(_selectedPendingIds.clear);
      final tab = _currentTab;
      if (tab.items.isEmpty && !tab.initialLoading) {
        _loadFirstPage();
      } else {
        setState(() {});
      }
    }
  }

  Future<void> _loadFirstPage() async {
    final tab = _currentTab;
    setState(() {
      tab.initialLoading = true;
      tab.loadingMore = false;
      tab.error = null;
      tab.items.clear();
      tab.page = 0;
      tab.hasMore = true;
    });
    await _fetchPage(1, replace: true);
  }

  Future<void> _loadMore() async {
    final tab = _currentTab;
    if (!tab.hasMore || tab.loadingMore || tab.initialLoading) return;
    setState(() => tab.loadingMore = true);
    await _fetchPage(tab.page + 1, replace: false);
  }

  Future<void> _fetchPage(int page, {required bool replace}) async {
    final tab = _currentTab;
    try {
      final result = await context.read<AppState>().manager.listComments(
            tab: _tabs[_tabController.index],
            postId: widget.thread.postId,
            familyId: widget.thread.familyId,
            search: _searchQuery,
            page: page,
          );
      if (!mounted) return;
      setState(() {
        if (replace) {
          tab.items
            ..clear()
            ..addAll(result.items);
        } else {
          tab.items.addAll(result.items);
        }
        tab.page = result.currentPage;
        tab.hasMore = result.hasMore;
        tab.initialLoading = false;
        tab.loadingMore = false;
        tab.error = null;
      });
      schedulePaginatedPrefetch(
        controller: _scrollCtrl,
        mounted: mounted,
        hasMore: tab.hasMore,
        loadingMore: tab.loadingMore,
        initialLoading: tab.initialLoading,
        loadMore: _loadMore,
      );
      await _markUnseenAsSeen(result.items);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        tab.error = messageOf(e);
        tab.initialLoading = false;
        tab.loadingMore = false;
      });
    }
  }

  /// Mark newly loaded comments (and nested replies) as seen so hub unread badges update on return.
  Future<void> _markUnseenAsSeen(List<FamilyCommentModel> comments) async {
    final unseen = <FamilyCommentModel>[];
    for (final comment in comments) {
      if (!comment.seenByBahram) unseen.add(comment);
      for (final reply in comment.replies) {
        if (!reply.seenByBahram && !reply.isBahramReply) unseen.add(reply);
      }
    }
    if (unseen.isEmpty || !mounted) return;

    final manager = context.read<AppState>().manager;
    final markedIds = <int>{};

    await Future.wait(unseen.map((comment) async {
      try {
        await manager.markSeen(comment.id);
        markedIds.add(comment.id);
      } catch (_) {}
    }));

    if (!mounted || markedIds.isEmpty) return;

    setState(() {
      for (final tab in _tabData) {
        for (var i = 0; i < tab.items.length; i++) {
          final item = tab.items[i];
          if (markedIds.contains(item.id) && !item.seenByBahram) {
            tab.items[i] = item.copyWith(seenByBahram: true);
          }
        }
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _resetTabsAndReload() {
    setState(_selectedPendingIds.clear);
    for (final t in _tabData) {
      t.items.clear();
      t.page = 0;
      t.hasMore = true;
    }
    _loadFirstPage();
  }

  /// Drop cached pages for other tabs so switching reloads fresh data.
  void _invalidateOtherTabs() {
    final current = _tabController.index;
    for (var i = 0; i < _tabData.length; i++) {
      if (i == current) continue;
      final t = _tabData[i];
      t.items.clear();
      t.page = 0;
      t.hasMore = true;
      t.error = null;
      t.initialLoading = false;
      t.loadingMore = false;
    }
  }

  static bool _matchesTab(FamilyCommentModel comment, String tab) {
    switch (tab) {
      case 'approved':
        return comment.status == 'approved';
      case 'rejected':
        return comment.status == 'rejected';
      case 'important':
        return comment.isImportant;
      case 'unread':
        return !comment.seenByBahram;
      case 'coaching_questions':
        return comment.signals.contains('coaching_question');
      default:
        return comment.status == 'pending';
    }
  }

  /// Update a root or nested comment in place — never wipe the list or jump scroll.
  void _applyCommentUpdate(FamilyCommentModel updated) {
    final tabKey = _tabs[_tabController.index];
    final tab = _currentTab;

    setState(() {
      _invalidateOtherTabs();

      final rootIndex = tab.items.indexWhere((c) => c.id == updated.id);
      if (rootIndex >= 0) {
        final merged = tab.items[rootIndex].mergedWith(updated);
        if (_matchesTab(merged, tabKey)) {
          tab.items[rootIndex] = merged;
        } else {
          tab.items.removeAt(rootIndex);
          _selectedPendingIds.remove(updated.id);
        }
        return;
      }

      for (var i = 0; i < tab.items.length; i++) {
        final root = tab.items[i];
        final replyIndex = root.replies.indexWhere((r) => r.id == updated.id);
        if (replyIndex < 0) continue;
        final replies = [...root.replies];
        replies[replyIndex] = replies[replyIndex].mergedWith(updated);
        tab.items[i] = root.copyWith(replies: replies);
        return;
      }
    });
  }

  void _appendReply(int parentId, FamilyCommentModel reply) {
    final tab = _currentTab;
    setState(() {
      _invalidateOtherTabs();
      for (var i = 0; i < tab.items.length; i++) {
        final root = tab.items[i];
        if (root.id != parentId) continue;
        if (root.replies.any((r) => r.id == reply.id)) return;
        tab.items[i] = root.copyWith(replies: [...root.replies, reply]);
        return;
      }
    });
  }

  Future<void> _withBusy(
    int commentId,
    CommentBusyAction action,
    Future<void> Function() work,
  ) async {
    if (_busyActions.containsKey(commentId) || _batchApproving) return;
    setState(() => _busyActions[commentId] = action);
    try {
      await work();
    } finally {
      if (mounted) setState(() => _busyActions.remove(commentId));
    }
  }

  Future<void> _approve(FamilyCommentModel comment) async {
    await _withBusy(comment.id, CommentBusyAction.approve, () async {
      try {
        final updated = await context.read<AppState>().manager.approveComment(comment.id);
        if (mounted) _applyCommentUpdate(updated);
      } catch (e) {
        if (mounted) showAppSnackBar(context, messageOf(e));
      }
    });
  }

  Future<void> _reject(FamilyCommentModel comment) async {
    if (_busyActions.containsKey(comment.id) || _batchApproving) return;
    final result = await showAppBottomSheet<({String reason, String note})>(
      context: context,
      title: 'رد نظر',
      child: const _RejectSheetContent(),
    );
    if (result == null || !mounted) return;

    await _withBusy(comment.id, CommentBusyAction.reject, () async {
      try {
        final updated = await context.read<AppState>().manager.rejectComment(
              comment.id,
              reason: result.reason,
              note: result.note,
            );
        if (mounted) _applyCommentUpdate(updated);
      } catch (e) {
        if (mounted) showAppSnackBar(context, messageOf(e));
      }
    });
  }

  Future<void> _toggleImportant(FamilyCommentModel comment) async {
    await _withBusy(comment.id, CommentBusyAction.important, () async {
      try {
        final updated = await context.read<AppState>().manager.toggleImportant(comment.id);
        if (!mounted) return;
        _applyCommentUpdate(updated);
        showAppSnackBar(
          context,
          comment.isImportant ? 'برچسب مهم برداشته شد.' : 'نظر به‌عنوان مهم علامت خورد.',
        );
      } catch (e) {
        if (mounted) showAppSnackBar(context, messageOf(e));
      }
    });
  }

  Future<void> _reply(FamilyCommentModel comment) async {
    if (_busyActions.containsKey(comment.id) || _batchApproving) return;
    final reply = await showCommentReplySheet(context: context, comment: comment);
    if (reply != null && mounted) {
      showAppSnackBar(context, 'پاسخ بهرام ارسال شد.');
      _appendReply(comment.id, reply);
    }
  }

  Future<void> _batchApprove() async {
    if (_selectedPendingIds.isEmpty || _batchApproving) return;
    if (_selectedPendingIds.any(_busyActions.containsKey)) return;
    final ids = _selectedPendingIds.toList();
    setState(() => _batchApproving = true);
    try {
      final count = await context.read<AppState>().manager.batchApprove(ids);
      if (!mounted) return;
      showAppSnackBar(context, '${toFaDigits(count.toString())} نظر تأیید شد.');
      final idSet = ids.toSet();
      setState(() {
        _invalidateOtherTabs();
        _currentTab.items.removeWhere((c) => idSet.contains(c.id));
        _selectedPendingIds.clear();
      });
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _batchApproving = false);
    }
  }

  Widget _buildSearchField() {
    return TextField(
      controller: _searchCtrl,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        labelText: 'جستجو در نظرات',
        hintText: 'متن نظر یا نام شخص',
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: _searchCtrl.text.isNotEmpty
            ? IconButton(
                tooltip: 'پاک کردن',
                onPressed: () {
                  _searchCtrl.clear();
                  _resetTabsAndReload();
                },
                icon: const Icon(Icons.clear_rounded),
              )
            : null,
        isDense: true,
      ),
      onSubmitted: (_) => _resetTabsAndReload(),
    );
  }

  Widget _buildPostHeader() {
    final thread = widget.thread;
    final typeLabel = thread.postType != null ? labelOf(postTypeLabels, thread.postType!) : 'پست';
    final title = (thread.postPreview?.trim().isNotEmpty == true)
        ? thread.postPreview!.trim()
        : 'پست $typeLabel #${toFaDigits(thread.postId.toString())}';
    final publishedLabel = thread.publishedAt != null
        ? 'انتشار: ${formatDateTime(thread.publishedAt)}'
        : null;

    return GlassPanel(
      borderRadius: 16,
      blur: 0,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            thread.familyInternalName ?? 'خانواده',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(title, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(height: 1.5)),
          if (publishedLabel != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(publishedLabel, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65), fontSize: 12)),
          ],
          const SizedBox(height: AppSpacing.xs),
          Text(typeLabel, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 12, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _buildBody() {
    final tab = _currentTab;
    final comments = tab.items;
    final isPendingTab = _tabs[_tabController.index] == 'pending';
    final pad = AppBreakpoints.scrollPadding(context);

    if (tab.initialLoading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: pad,
        children: [
          _buildPostHeader(),
          const SizedBox(height: AppSpacing.md),
          _buildSearchField(),
          const SizedBox(height: AppSpacing.xl),
          const Center(child: CircularProgressIndicator()),
        ],
      );
    }

    if (tab.error != null && comments.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: pad,
        children: [
          _buildPostHeader(),
          const SizedBox(height: AppSpacing.md),
          _buildSearchField(),
          const SizedBox(height: AppSpacing.lg),
          EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'خطا در بارگذاری نظرات',
            subtitle: tab.error!,
            actionLabel: 'تلاش مجدد',
            onAction: _loadFirstPage,
          ),
        ],
      );
    }

    if (comments.isEmpty) {
      return ListView(
        controller: _scrollCtrl,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: pad,
        children: [
          _buildPostHeader(),
          const SizedBox(height: AppSpacing.md),
          _buildSearchField(),
          const SizedBox(height: AppSpacing.lg),
          EmptyState(
            title: _searchQuery == null ? 'نظری در این بخش نیست' : 'نتیجه‌ای برای این جستجو نیست',
            icon: _searchQuery == null ? Icons.forum_outlined : Icons.search_off_rounded,
          ),
        ],
      );
    }

    final itemCount = comments.length + (tab.hasMore || tab.loadingMore ? 1 : 0);

    return ListView.separated(
      controller: _scrollCtrl,
      padding: pad,
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: itemCount + 2,
      separatorBuilder: (_, index) {
        if (index >= comments.length + 1) return const SizedBox.shrink();
        return const SizedBox(height: AppSpacing.md);
      },
      itemBuilder: (context, index) {
        if (index == 0) return _buildPostHeader();
        if (index == 1) return _buildSearchField();
        final commentIndex = index - 2;
        if (commentIndex >= comments.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final c = comments[commentIndex];
        final selected = _selectedPendingIds.contains(c.id);
        final replyBusy = <int, CommentBusyAction>{
          for (final reply in c.replies)
            if (_busyActions.containsKey(reply.id)) reply.id: _busyActions[reply.id]!,
        };
        return CommentCard(
          comment: c,
          showFamily: false,
          selectable: isPendingTab,
          selected: selected,
          busyAction: _busyActions[c.id],
          replyBusyActions: replyBusy,
          batchBusy: _batchApproving && selected,
          onSelectedChanged: isPendingTab
              ? (value) {
                  if (_batchApproving) return;
                  setState(() {
                    if (value) {
                      _selectedPendingIds.add(c.id);
                    } else {
                      _selectedPendingIds.remove(c.id);
                    }
                  });
                }
              : null,
          onApprove: () => _approve(c),
          onReject: () => _reject(c),
          onToggleImportant: () => _toggleImportant(c),
          onReply: () => _reply(c),
          onApproveReply: _approve,
          onRejectReply: _reject,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isPendingTab = _tabs[_tabController.index] == 'pending';
    final familyName = widget.thread.familyInternalName ?? 'خانواده';

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: Text(_selectedPendingIds.isEmpty
            ? 'نظرات — $familyName'
            : '${toFaDigits(_selectedPendingIds.length.toString())} انتخاب‌شده'),
        actions: [
          IconButton(
            onPressed: _loadFirstPage,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'بروزرسانی',
          ),
          if (isPendingTab && _selectedPendingIds.isNotEmpty)
            IconButton(
              tooltip: 'تأیید گروهی',
              onPressed: _batchApproving ? null : _batchApprove,
              icon: _batchApproving
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.done_all_rounded),
            ),
        ],
        bottom: AppTabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _tabs.map((t) => _tabLabels[t]!).toList(),
          icons: const [
            Icons.hourglass_top_rounded,
            Icons.check_circle_outline_rounded,
            Icons.cancel_outlined,
            Icons.star_rounded,
            Icons.mark_email_unread_rounded,
            Icons.psychology_rounded,
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadFirstPage,
        child: _buildBody(),
      ),
    );
  }
}

class _RejectSheetContent extends StatefulWidget {
  const _RejectSheetContent();

  @override
  State<_RejectSheetContent> createState() => _RejectSheetContentState();
}

class _RejectSheetContentState extends State<_RejectSheetContent> {
  String _reason = 'other';
  final _noteCtrl = TextEditingController();

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          value: _reason,
          items: rejectionReasonLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
          onChanged: (v) => setState(() => _reason = v ?? 'other'),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _noteCtrl,
          decoration: const InputDecoration(labelText: 'یادداشت (اختیاری)'),
        ),
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: 'رد نظر',
          onPressed: () => Navigator.pop(context, (reason: _reason, note: _noteCtrl.text.trim())),
        ),
      ],
    );
  }
}
