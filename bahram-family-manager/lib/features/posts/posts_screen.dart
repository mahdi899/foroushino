import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_family_filter_bar.dart';
import 'package:bahram_family_manager/features/posts/post_editor_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
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

class _PostsScreenState extends State<PostsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _statuses = const ['draft', 'published', 'archived'];
  Future<PaginatedResult<FamilyPostModel>>? _future;
  List<FamilySummaryModel> _families = [];
  bool _familiesLoaded = false;
  int? _familyFilter;
  bool _archivedSelectionMode = false;
  final Set<int> _selectedArchivedIds = {};

  bool get _showFamilyFilter {
    final status = _statuses[_tabController.index];
    return status == 'published' || status == 'archived';
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statuses.length, vsync: this)..addListener(_onTabChanged);
    _loadFamilies();
    _load();
  }

  Future<void> _loadFamilies() async {
    try {
      final data = await context.read<AppState>().manager.listFamilies(perPage: 100);
      if (mounted) {
        setState(() {
          _families = data.items;
          _familiesLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _familiesLoaded = true);
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
      _load();
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

  void _load() {
    final status = _statuses[_tabController.index];
    setState(() {
      _future = context.read<AppState>().manager.listPosts(
            status: status,
            familyId: _showFamilyFilter ? _familyFilter : null,
          );
    });
  }

  void _setFamilyFilter(int? familyId) {
    setState(() => _familyFilter = familyId);
    _load();
  }

  Future<void> _openEditor([FamilyPostModel? post]) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => PostEditorScreen(post: post)),
    );
    if (changed == true) _load();
  }

  Future<void> _togglePin(FamilyPostModel post) async {
    try {
      final manager = context.read<AppState>().manager;
      final updated = post.isPinned ? await manager.unpinPost(post.id) : await manager.pinPost(post.id);
      if (mounted) {
        showAppSnackBar(context, updated.isPinned ? 'پست سنجاق شد.' : 'سنجاق برداشته شد.');
        _load();
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
        _load();
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
        _load();
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
        _load();
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
    _load();

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
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
        onRefresh: () async => _load(),
        child: FutureBuilder<PaginatedResult<FamilyPostModel>>(
          future: _future,
          builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilyPostModel>>(
            snapshot: snapshot,
            emptyMessage: 'پستی وجود ندارد.',
            emptyIcon: Icons.campaign_outlined,
            builder: (context, data) {
              final posts = data.items;
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

              if (posts.isEmpty) {
                return ListView(
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
                padding: AppBreakpoints.pagePadding(context),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: posts.length + headerCount,
                separatorBuilder: (_, index) {
                  if (index < headerCount) {
                    return const SizedBox(height: AppSpacing.md);
                  }
                  return const SizedBox(height: AppSpacing.md);
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

                  final post = posts[index - offset];
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
            },
          ),
        ),
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
