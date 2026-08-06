import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/paginated_scroll.dart';
import 'package:bahram_family_manager/features/comments/post_comments_screen.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_family_filter_bar.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart'; // messageOf
import 'package:bahram_family_manager/widgets/comments/comment_thread_card.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class _ThreadsTabData {
  final items = <CommentThreadModel>[];
  var page = 0;
  var hasMore = true;
  var initialLoading = false;
  var loadingMore = false;
  String? error;
}

/// Comments hub: posts with comments, grouped by family — open detail via «مشاهده کامنت‌ها».
class CommentsScreen extends StatefulWidget {
  const CommentsScreen({super.key});

  @override
  State<CommentsScreen> createState() => _CommentsScreenState();
}

class _CommentsScreenState extends State<CommentsScreen> with SingleTickerProviderStateMixin {
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
  final _tabData = List.generate(_tabs.length, (_) => _ThreadsTabData());
  List<FamilySummaryModel> _families = [];
  int? _familyFilter;

  _ThreadsTabData get _currentTab => _tabData[_tabController.index];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this)..addListener(_onTabChanged);
    _scrollCtrl.addListener(_onScroll);
    _loadFamilies();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadFirstPage();
    });
  }

  Future<void> _loadFamilies() async {
    try {
      final data = await context.read<AppState>().cachedFamilies();
      if (mounted) setState(() => _families = data);
    } catch (_) {}
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
      final result = await context.read<AppState>().manager.listCommentThreads(
            tab: _tabs[_tabController.index],
            familyId: _familyFilter,
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

  void _openThread(CommentThreadModel thread) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PostCommentsScreen(
          thread: thread,
          initialTab: _tabs[_tabController.index],
        ),
      ),
    );
  }

  /// Preserve hub sort order while grouping rows under family headers.
  List<({String title, List<CommentThreadModel> threads})> _groupedThreads(
    List<CommentThreadModel> threads,
  ) {
    final order = <int>[];
    final map = <int, List<CommentThreadModel>>{};
    final names = <int, String>{};

    for (final thread in threads) {
      if (!map.containsKey(thread.familyId)) {
        order.add(thread.familyId);
        names[thread.familyId] = thread.familyInternalName ?? 'خانواده ${toFaDigits(thread.familyId.toString())}';
      }
      map.putIfAbsent(thread.familyId, () => []).add(thread);
    }

    return order
        .map((id) => (title: names[id]!, threads: map[id]!))
        .toList(growable: false);
  }

  Widget _buildBody() {
    final tab = _currentTab;
    final threads = tab.items;

    if (tab.initialLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (tab.error != null && threads.isEmpty) {
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

    final pagePad = AppBreakpoints.shellTabPadding(context);
    final groups = _groupedThreads(threads);

    return ListView(
      controller: _scrollCtrl,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: pagePad,
      children: [
        if (_families.isNotEmpty) ...[
          PostFamilyFilterBar(
            families: _families,
            selectedFamilyId: _familyFilter,
            onChanged: (id) {
              setState(() => _familyFilter = id);
              for (final t in _tabData) {
                t.items.clear();
                t.page = 0;
                t.hasMore = true;
              }
              _loadFirstPage();
            },
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        if (threads.isEmpty)
          const EmptyState(title: 'پستی با نظر در این بخش نیست', icon: Icons.forum_outlined)
        else ...[
          for (final group in groups) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm, top: AppSpacing.sm),
              child: Row(
                children: [
                  Icon(Icons.groups_rounded, size: 18, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      group.title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                  Text(
                    toFaDigits(group.threads.length.toString()),
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                ],
              ),
            ),
            for (final thread in group.threads) ...[
              CommentThreadCard(
                thread: thread,
                onViewComments: () => _openThread(thread),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ],
          if (tab.hasMore || tab.loadingMore)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Center(child: CircularProgressIndicator()),
            ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: const Text('نظرات خانواده'),
        showShellActions: true,
        actions: [
          IconButton(
            onPressed: _loadFirstPage,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'بروزرسانی',
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
