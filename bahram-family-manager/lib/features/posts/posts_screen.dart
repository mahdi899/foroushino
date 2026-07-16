import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/paginated_scroll.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_family_filter_bar.dart';
import 'package:bahram_family_manager/features/posts/post_editor_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_dialog.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/posts/post_list_tile.dart';

class PostsScreen extends StatefulWidget {
  const PostsScreen({super.key});

  @override
  State<PostsScreen> createState() => _PostsScreenState();
}

class _PostsTabData {
  final items = <FamilyPostModel>[];
  var page = 0;
  var hasMore = true;
  var initialLoading = false;
  var loadingMore = false;
  String? error;
}

class _PostsScreenState extends State<PostsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _statuses = const ['draft', 'published', 'archived'];
  final _scrollCtrl = ScrollController();
  final _tabData = List.generate(3, (_) => _PostsTabData());
  List<FamilySummaryModel> _families = [];
  bool _familiesLoaded = false;
  int? _familyFilter;
  bool _archivedSelectionMode = false;
  final Set<int> _selectedArchivedIds = {};

  _PostsTabData get _currentTab => _tabData[_tabController.index];

  bool get _showFamilyFilter {
    final status = _statuses[_tabController.index];
    return status == 'published' || status == 'archived';
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statuses.length, vsync: this)..addListener(_onTabChanged);
    _scrollCtrl.addListener(_onScroll);
    _loadFamilies();
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

  Future<void> _loadFamilies() async {
    try {
      final data = await context.read<AppState>().cachedFamilies();
      if (mounted) {
        setState(() {
          _families = data;
          _familiesLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _familiesLoaded = true);
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
    final status = _statuses[_tabController.index];
    try {
      final result = await context.read<AppState>().manager.listPosts(
            status: status,
            familyId: _showFamilyFilter ? _familyFilter : null,
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

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      if (_statuses[_tabController.index] == 'draft' && _familyFilter != null) {
        setState(() => _familyFilter = null);
      }
      if (_statuses[_tabController.index] != 'archived') {
        _exitArchivedSelection();
      }
      final tab = _currentTab;
      if (tab.items.isEmpty && !tab.initialLoading) {
        _loadFirstPage();
      } else {
        setState(() {});
      }
    }
  }

  void _exitArchivedSelection() {
    _archivedSelectionMode = false;
    _selectedArchivedIds.clear();
  }

  void _toggleArchivedSelectionMode() {
    setState(() {
      if (_archivedSelectionMode) {
        _exitArchivedSelection();
      } else {
        _archivedSelectionMode = true;
      }
    });
  }

  void _toggleArchivedPostSelection(int postId, bool selected) {
    setState(() {
      if (selected) {
        _selectedArchivedIds.add(postId);
      } else {
        _selectedArchivedIds.remove(postId);
      }
      if (_selectedArchivedIds.isEmpty) {
        _archivedSelectionMode = false;
      }
    });
  }

  void _selectAllArchived(List<FamilyPostModel> posts) {
    setState(() {
      _archivedSelectionMode = true;
      _selectedArchivedIds
        ..clear()
        ..addAll(posts.map((post) => post.id));
    });
  }

  void _setFamilyFilter(int? familyId) {
    setState(() => _familyFilter = familyId);
    _loadFirstPage();
  }

  Future<void> _openEditor([FamilyPostModel? post]) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => PostEditorScreen(post: post)),
    );
    if (changed == true) _loadFirstPage();
  }

  Future<void> _togglePin(FamilyPostModel post) async {
    try {
      final manager = context.read<AppState>().manager;
      final updated = post.isPinned ? await manager.unpinPost(post.id) : await manager.pinPost(post.id);
      if (mounted) {
        showAppSnackBar(context, updated.isPinned ? 'پست سنجاق شد.' : 'سنجاق برداشته شد.');
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _publish(FamilyPostModel post) async {
    try {
      await context.read<AppState>().manager.publishPost(post.id);
      if (mounted) {
        showAppSnackBar(context, 'پست منتشر شد.');
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _republish(FamilyPostModel post) async {
    try {
      await context.read<AppState>().manager.publishPost(post.id);
      if (mounted) {
        showAppSnackBar(context, 'پست دوباره منتشر شد و به بالای فید رفت.');
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _delete(FamilyPostModel post) async {
    final isPublished = post.isPublished;
    final isArchived = post.isArchived;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: isArchived
          ? 'حذف پست آرشیوشده'
          : (isPublished ? 'حذف پست منتشرشده' : 'حذف پیش‌نویس'),
      content: Text(
        isArchived
            ? 'این پست آرشیوشده برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.'
            : (isPublished
                ? 'این پست از فید خانواده حذف می‌شود. این عمل قابل بازگشت نیست.'
                : 'این پیش‌نویس برای همیشه حذف می‌شود.'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          style: TextButton.styleFrom(foregroundColor: Colors.red),
          child: const Text('حذف'),
        ),
      ],
    );
    if (confirmed != true) return;

    try {
      await context.read<AppState>().manager.deletePost(post.id);
      if (mounted) {
        showAppSnackBar(context, 'پست حذف شد.');
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _deleteSelectedArchived() async {
    if (_selectedArchivedIds.isEmpty) return;

    final count = _selectedArchivedIds.length;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'حذف پست‌های آرشیوشده',
      content: Text(
        '${toFaDigits(count.toString())} پست آرشیوشده برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          style: TextButton.styleFrom(foregroundColor: Colors.red),
          child: const Text('حذف'),
        ),
      ],
    );
    if (confirmed != true) return;

    final manager = context.read<AppState>().manager;
    var deleted = 0;
    var failed = 0;

    for (final id in _selectedArchivedIds.toList()) {
      try {
        await manager.deletePost(id);
        deleted++;
      } catch (_) {
        failed++;
      }
    }

    if (!mounted) return;

    setState(_exitArchivedSelection);
    _loadFirstPage();

    if (failed == 0) {
      showAppSnackBar(context, '${toFaDigits(deleted.toString())} پست حذف شد.');
    } else {
      showAppSnackBar(
        context,
        '${toFaDigits(deleted.toString())} حذف شد، ${toFaDigits(failed.toString())} ناموفق.',
      );
    }
  }

  Future<void> _recover(FamilyPostModel post) async {
    final wasPublished = post.publishedAt != null;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'بازیابی از آرشیو',
      content: Text(
        wasPublished
            ? 'این پست دوباره منتشر می‌شود و در فید خانواده نمایش داده می‌شود.'
            : 'این پست به پیش‌نویس‌ها برمی‌گردد.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('بازیابی')),
      ],
    );
    if (confirmed != true) return;

    try {
      final recovered = await context.read<AppState>().manager.recoverPost(post.id);
      if (mounted) {
        showAppSnackBar(
          context,
          recovered.isPublished ? 'پست بازیابی و دوباره منتشر شد.' : 'پست به پیش‌نویس‌ها برگشت.',
        );
        _loadFirstPage();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Widget _buildPostsBody() {
    final tab = _currentTab;
    final posts = tab.items;

    if (tab.initialLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (tab.error != null && posts.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'خطا در بارگذاری پست‌ها',
            subtitle: tab.error!,
            actionLabel: 'تلاش مجدد',
            onAction: _loadFirstPage,
          ),
        ],
      );
    }

    final filterHeader = _showFamilyFilter && _familiesLoaded
        ? PostFamilyFilterBar(
            families: _families,
            selectedFamilyId: _familyFilter,
            onChanged: _setFamilyFilter,
          )
        : null;

    final status = _statuses[_tabController.index];
    final isPublishedTab = status == 'published';
    final isDraftTab = status == 'draft';
    final isArchivedTab = status == 'archived';
    final selectionToolbar = isArchivedTab
        ? _ArchivedSelectionToolbar(
            selectionMode: _archivedSelectionMode,
            selectedCount: _selectedArchivedIds.length,
            totalCount: posts.length,
            onEnterSelection: _toggleArchivedSelectionMode,
            onCancel: () => setState(_exitArchivedSelection),
            onSelectAll: () => _selectAllArchived(posts),
          )
        : null;
    final toolbarCount = selectionToolbar == null ? 0 : 1;
    final headerCount = (filterHeader == null ? 0 : 1) + toolbarCount;
    final footerCount = tab.hasMore || tab.loadingMore ? 1 : 0;

    if (posts.isEmpty) {
      return ListView(
        controller: _scrollCtrl,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: AppBreakpoints.pagePadding(context),
        children: [
          if (filterHeader != null) ...[
            filterHeader,
            const SizedBox(height: AppSpacing.lg),
          ],
          EmptyState(
            title: _familyFilter == null ? 'پستی وجود ندارد' : 'پستی برای این خانواده نیست',
            subtitle: _familyFilter == null
                ? 'از دکمه «پست جدید» در پایین صفحه یا سایدبار استفاده کنید.'
                : 'فیلتر دیگری انتخاب کنید یا همه کانال‌ها را ببینید.',
            icon: Icons.campaign_outlined,
          ),
        ],
      );
    }

    return ListView.separated(
      controller: _scrollCtrl,
      padding: AppBreakpoints.pagePadding(context),
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: posts.length + headerCount + footerCount,
      separatorBuilder: (_, index) {
        if (index < headerCount + posts.length - 1) {
          return const SizedBox(height: AppSpacing.md);
        }
        return const SizedBox.shrink();
      },
      itemBuilder: (context, index) {
        var offset = 0;
        if (filterHeader != null) {
          if (index == offset) return filterHeader;
          offset++;
        }
        if (selectionToolbar != null) {
          if (index == offset) return selectionToolbar;
          offset++;
        }

        final postIndex = index - offset;
        if (postIndex >= posts.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final post = posts[postIndex];
        return PostListTile(
          post: post,
          onTap: _archivedSelectionMode && isArchivedTab
              ? () {}
              : () => _openEditor(post),
          onLongPress: isArchivedTab && !_archivedSelectionMode
              ? () => setState(() {
                    _archivedSelectionMode = true;
                    _selectedArchivedIds.add(post.id);
                  })
              : null,
          selectable: isArchivedTab && _archivedSelectionMode,
          selected: _selectedArchivedIds.contains(post.id),
          onSelectedChanged: (selected) => _toggleArchivedPostSelection(post.id, selected),
          onPinToggle: isPublishedTab ? () => _togglePin(post) : null,
          onEdit: isDraftTab || isPublishedTab || isArchivedTab ? () => _openEditor(post) : null,
          onPublish: isDraftTab ? () => _publish(post) : null,
          onRepublish: isPublishedTab || isArchivedTab ? () => _republish(post) : null,
          onDelete: isDraftTab || isPublishedTab || isArchivedTab ? () => _delete(post) : null,
          onRecover: isArchivedTab ? () => _recover(post) : null,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isArchivedTab = _statuses[_tabController.index] == 'archived';

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: Text(
          _archivedSelectionMode
              ? '${toFaDigits(_selectedArchivedIds.length.toString())} انتخاب‌شده'
              : 'پست‌های خانواده',
        ),
        bottom: AppTabBar(
          controller: _tabController,
          tabs: _statuses.map((s) => labelOf(postStatusLabels, s)).toList(),
        ),
      ),
      bottomNavigationBar: isArchivedTab && _selectedArchivedIds.isNotEmpty
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.md),
                child: FilledButton.icon(
                  onPressed: _deleteSelectedArchived,
                  icon: const Icon(Icons.delete_outline_rounded),
                  label: Text('حذف ${toFaDigits(_selectedArchivedIds.length.toString())} پست'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _loadFirstPage,
        child: _buildPostsBody(),
      ),
    );
  }
}

class _ArchivedSelectionToolbar extends StatelessWidget {
  const _ArchivedSelectionToolbar({
    required this.selectionMode,
    required this.selectedCount,
    required this.totalCount,
    required this.onEnterSelection,
    required this.onCancel,
    required this.onSelectAll,
  });

  final bool selectionMode;
  final int selectedCount;
  final int totalCount;
  final VoidCallback onEnterSelection;
  final VoidCallback onCancel;
  final VoidCallback onSelectAll;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return GlassPanel(
      borderRadius: 16,
      blur: 18,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Text(
              selectionMode
                  ? '${toFaDigits(selectedCount.toString())} از ${toFaDigits(totalCount.toString())} انتخاب‌شده'
                  : 'برای حذف گروهی، پست‌ها را انتخاب کنید',
              style: TextStyle(
                color: scheme.onSurface.withValues(alpha: 0.75),
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (selectionMode) ...[
            TextButton(onPressed: onSelectAll, child: const Text('همه')),
            TextButton(onPressed: onCancel, child: const Text('انصراف')),
          ] else
            TextButton.icon(
              onPressed: onEnterSelection,
              icon: const Icon(Icons.checklist_rounded, size: 18),
              label: const Text('انتخاب'),
            ),
        ],
      ),
    );
  }
}
