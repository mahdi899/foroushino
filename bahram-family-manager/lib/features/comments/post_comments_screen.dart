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
  });

  final CommentThreadModel thread;
  final String initialTab;

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
  final _tabData = List.generate(_tabs.length, (_) => _CommentsTabData());
  final Set<int> _selectedPendingIds = {};

  _CommentsTabData get _currentTab => _tabData[_tabController.index];

  @override
  void initState() {
    super.initState();
    final initial = _tabs.indexOf(widget.initialTab);
    _tabController = TabController(
      length: _tabs.length,
      vsync: this,
      initialIndex: initial >= 0 ? initial : 0,
    )..addListener(_onTabChanged);
    _scrollCtrl.addListener(_onScroll);
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
    } catch (e) {
      if (!mounted) return;
      setState(() {
        tab.error = messageOf(e);
        tab.initialLoading = false;
        tab.loadingMore = false;
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _approve(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.approveComment(comment.id);
      _loadFirstPage();
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _reject(FamilyCommentModel comment) async {
    final result = await showAppBottomSheet<({String reason, String note})>(
      context: context,
      title: 'رد نظر',
      child: const _RejectSheetContent(),
    );
    if (result == null || !mounted) return;

    try {
      await context.read<AppState>().manager.rejectComment(comment.id, reason: result.reason, note: result.note);
      if (mounted) _loadFirstPage();
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _toggleImportant(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.toggleImportant(comment.id);
      _loadFirstPage();
      if (mounted) {
        showAppSnackBar(
          context,
          comment.isImportant ? 'برچسب مهم برداشته شد.' : 'نظر به‌عنوان مهم علامت خورد.',
        );
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _reply(FamilyCommentModel comment) async {
    final replied = await showCommentReplySheet(context: context, comment: comment);
    if (replied == true && mounted) {
      showAppSnackBar(context, 'پاسخ بهرام ارسال شد.');
      _loadFirstPage();
    }
  }

  Future<void> _batchApprove() async {
    if (_selectedPendingIds.isEmpty) return;
    try {
      final count = await context.read<AppState>().manager.batchApprove(_selectedPendingIds.toList());
      if (mounted) {
        showAppSnackBar(context, '${toFaDigits(count.toString())} نظر تأیید شد.');
        setState(_selectedPendingIds.clear);
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Widget _buildPostHeader() {
    final thread = widget.thread;
    final typeLabel = thread.postType != null ? labelOf(postTypeLabels, thread.postType!) : 'پست';
    final preview = (thread.postPreview?.trim().isNotEmpty == true)
        ? thread.postPreview!.trim()
        : 'پست $typeLabel #${toFaDigits(thread.postId.toString())}';

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
          Text(preview, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildBody() {
    final tab = _currentTab;
    final comments = tab.items;
    final isPendingTab = _tabs[_tabController.index] == 'pending';

    if (tab.initialLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (tab.error != null && comments.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
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
        padding: AppBreakpoints.scrollPadding(context),
        children: [
          _buildPostHeader(),
          const SizedBox(height: AppSpacing.lg),
          const EmptyState(title: 'نظری در این بخش نیست', icon: Icons.forum_outlined),
        ],
      );
    }

    final itemCount = comments.length + (tab.hasMore || tab.loadingMore ? 1 : 0);

    return ListView.separated(
      controller: _scrollCtrl,
      padding: AppBreakpoints.scrollPadding(context),
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: itemCount + 1,
      separatorBuilder: (_, index) {
        if (index >= comments.length) return const SizedBox.shrink();
        return const SizedBox(height: AppSpacing.md);
      },
      itemBuilder: (context, index) {
        if (index == 0) return _buildPostHeader();
        final commentIndex = index - 1;
        if (commentIndex >= comments.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final c = comments[commentIndex];
        final selected = _selectedPendingIds.contains(c.id);
        return CommentCard(
          comment: c,
          showFamily: false,
          selectable: isPendingTab,
          selected: selected,
          onSelectedChanged: isPendingTab
              ? (value) => setState(() {
                    if (value) {
                      _selectedPendingIds.add(c.id);
                    } else {
                      _selectedPendingIds.remove(c.id);
                    }
                  })
              : null,
          onApprove: () => _approve(c),
          onReject: () => _reject(c),
          onToggleImportant: () => _toggleImportant(c),
          onReply: () => _reply(c),
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
              onPressed: _batchApprove,
              icon: const Icon(Icons.done_all_rounded),
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
