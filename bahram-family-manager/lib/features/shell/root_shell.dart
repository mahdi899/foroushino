import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/features/ai/ai_settings_screen.dart';
import 'package:bahram_family_manager/features/analytics/analytics_screen.dart';
import 'package:bahram_family_manager/features/comments/comments_screen.dart';
import 'package:bahram_family_manager/features/families/families_screen.dart';
import 'package:bahram_family_manager/features/home/home_screen.dart';
import 'package:bahram_family_manager/features/posts/post_editor_screen.dart';
import 'package:bahram_family_manager/features/posts/posts_screen.dart';
import 'package:bahram_family_manager/features/settings/settings_screen.dart';
import 'package:bahram_family_manager/features/stories/stories_screen.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/layout/desktop_shell.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/layout/shell_scope.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';

class _Tab {
  const _Tab({required this.label, required this.icon, required this.builder, this.permission});

  final String label;
  final IconData icon;
  final WidgetBuilder builder;
  final String? permission;
}

class _KeepAliveTab extends StatefulWidget {
  const _KeepAliveTab({super.key, required this.builder});

  final WidgetBuilder builder;

  @override
  State<_KeepAliveTab> createState() => _KeepAliveTabState();
}

class _KeepAliveTabState extends State<_KeepAliveTab> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.builder(context);
  }
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  var _index = 0;

  static final _primaryTabs = <_Tab>[
    _Tab(label: 'خانه', icon: Icons.dashboard_rounded, builder: (_) => const HomeScreen()),
    _Tab(
      label: 'پست‌ها',
      icon: Icons.campaign_rounded,
      builder: (_) => const PostsScreen(),
      permission: 'family.posts.create',
    ),
    _Tab(
      label: 'استوری',
      icon: Icons.auto_stories_rounded,
      builder: (_) => const StoriesScreen(),
      permission: 'family.stories.manage',
    ),
    _Tab(
      label: 'نظرات',
      icon: Icons.forum_rounded,
      builder: (_) => const CommentsScreen(),
      permission: 'family.comments.moderate',
    ),
    _Tab(
      label: 'خانواده‌ها',
      icon: Icons.groups_rounded,
      builder: (_) => const FamiliesScreen(),
      permission: 'family.families.view',
    ),
  ];

  static final _moreTabs = <_Tab>[
    _Tab(
      label: 'تحلیل',
      icon: Icons.insights_rounded,
      builder: (_) => const AnalyticsScreen(),
      permission: 'family.analytics.view',
    ),
    _Tab(
      label: 'هوش مصنوعی',
      icon: Icons.auto_awesome_rounded,
      builder: (_) => const AiSettingsScreen(),
      permission: 'family.settings.manage',
    ),
    _Tab(
      label: 'برندینگ',
      icon: Icons.palette_rounded,
      builder: (_) => const SettingsScreen(),
      permission: 'family.settings.manage',
    ),
  ];

  bool _canSee(_Tab t, AppState state) {
    final user = state.user;
    if (t.permission == null) return true;
    return user?.can(t.permission!) ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final isDesktop = AppBreakpoints.isDesktop(context);

    final primaryVisible = _primaryTabs.where((t) => _canSee(t, state)).toList();
    final moreVisible = _moreTabs.where((t) => _canSee(t, state)).toList();
    final shellTabs = isDesktop ? [...primaryVisible, ...moreVisible] : primaryVisible;

    if (shellTabs.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: const ManagerAppBar(title: Text('مدیر خانواده بهرام')),
        body: const EmptyState(
          icon: Icons.lock_outline_rounded,
          title: 'دسترسی ندارید',
          subtitle: 'حساب شما به مدیریت خانواده داداش بهرام دسترسی ندارد.\nبا مدیر کل تماس بگیرید.',
        ),
      );
    }

    final index = _index.clamp(0, shellTabs.length - 1);
    final canCompose = state.user?.can('family.posts.create') ?? false;

    Future<void> openCompose() async {
      await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const PostEditorScreen()),
      );
    }

    return ShellScope(
      goToTab: (i) => setState(() => _index = i),
      onComposePost: canCompose ? openCompose : null,
      tabLabels: shellTabs.map((t) => t.label).toList(),
      child: DesktopShell(
        currentIndex: index,
        onIndexChanged: (i) => setState(() => _index = i),
        onComposePost: canCompose ? openCompose : null,
        items: shellTabs
            .map((t) => AppBottomNavItem(label: t.label, icon: t.icon))
            .toList(),
        body: IndexedStack(
          index: index,
          sizing: StackFit.expand,
          children: [
            for (final tab in shellTabs)
              _KeepAliveTab(
                key: ValueKey(tab.label),
                builder: tab.builder,
              ),
          ],
        ),
      ),
    );
  }
}
