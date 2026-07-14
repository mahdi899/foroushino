import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/features/posts/post_editor_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statuses.length, vsync: this)..addListener(_onTabChanged);
    _load();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.listPosts(status: _statuses[_tabController.index]);
    });
  }

  Future<void> _openEditor([FamilyPostModel? post]) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => PostEditorScreen(post: post)),
    );
    if (changed == true) _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('پست‌های خانواده'),
        bottom: AppTabBar(
          controller: _tabController,
          tabs: _statuses.map((s) => labelOf(postStatusLabels, s)).toList(),
        ),
      ),
      floatingActionButton: GradientFab(
        onPressed: () => _openEditor(),
        label: 'پست جدید',
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
              if (posts.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    EmptyState(
                      title: 'پستی وجود ندارد',
                      subtitle: 'اولین پست خانواده را از دکمه پایین بسازید.',
                      icon: Icons.campaign_outlined,
                    ),
                  ],
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.lg),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: posts.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                itemBuilder: (context, index) => PostListTile(
                  post: posts[index],
                  onTap: () => _openEditor(posts[index]),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
