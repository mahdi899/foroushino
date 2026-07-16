import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
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
      _load();
    }
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
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: isPublished ? 'حذف پست منتشرشده' : 'حذف پیش‌نویس',
      content: Text(
        isPublished
            ? 'این پست از فید خانواده حذف می‌شود. این عمل قابل بازگشت نیست.'
            : 'این پیش‌نویس برای همیشه حذف می‌شود.',
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
    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: const Text('پست‌های خانواده'),
        bottom: AppTabBar(
          controller: _tabController,
          tabs: _statuses.map((s) => labelOf(postStatusLabels, s)).toList(),
        ),
      ),
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

              final headerCount = filterHeader == null ? 0 : 1;

              return ListView.separated(
                padding: AppBreakpoints.pagePadding(context),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: posts.length + headerCount,
                separatorBuilder: (_, index) {
                  if (filterHeader != null && index == 0) {
                    return const SizedBox(height: AppSpacing.lg);
                  }
                  return const SizedBox(height: AppSpacing.md);
                },
                itemBuilder: (context, index) {
                  if (filterHeader != null && index == 0) {
                    return filterHeader;
                  }

                  final post = posts[index - headerCount];
                  final status = _statuses[_tabController.index];
                  final isPublishedTab = status == 'published';
                  final isDraftTab = status == 'draft';
                  final isArchivedTab = status == 'archived';
                  return PostListTile(
                    post: post,
                    onTap: () => _openEditor(post),
                    onPinToggle: isPublishedTab ? () => _togglePin(post) : null,
                    onEdit: isDraftTab || isPublishedTab || status == 'archived' ? () => _openEditor(post) : null,
                    onPublish: isDraftTab ? () => _publish(post) : null,
                    onRepublish: isPublishedTab || isArchivedTab ? () => _republish(post) : null,
                    onDelete: isDraftTab || isPublishedTab ? () => _delete(post) : null,
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
