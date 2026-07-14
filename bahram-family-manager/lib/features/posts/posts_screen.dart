import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/posts/post_editor_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

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
        bottom: TabBar(
          controller: _tabController,
          tabs: _statuses.map((s) => Tab(text: labelOf(postStatusLabels, s))).toList(),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openEditor(),
        child: const Icon(Icons.add_rounded),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<PaginatedResult<FamilyPostModel>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [Text(messageOf(snapshot.error!), style: const TextStyle(color: AppColors.error))],
              );
            }

            final posts = snapshot.data!.items;
            if (posts.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: const [
                  Center(child: Text('پستی وجود ندارد.', style: TextStyle(color: AppColors.textMuted))),
                ],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: posts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) => _PostTile(post: posts[index], onTap: () => _openEditor(posts[index])),
            );
          },
        ),
      ),
    );
  }
}

class _PostTile extends StatelessWidget {
  const _PostTile({required this.post, required this.onTap});

  final FamilyPostModel post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _Chip(text: labelOf(postTypeLabels, post.type), color: AppColors.primary),
                  const SizedBox(width: 6),
                  if (post.isImportant) const _Chip(text: '⭐ مهم', color: AppColors.warning),
                  const Spacer(),
                  Text(formatDateTime(post.publishedAt ?? post.createdAt), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 8),
              Text(post.preview, maxLines: 2, overflow: TextOverflow.ellipsis),
              if (post.actions.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('🎯 دارای اکشن: ${post.actions.first.prompt}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
