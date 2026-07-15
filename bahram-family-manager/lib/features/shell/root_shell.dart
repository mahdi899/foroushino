import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/features/analytics/analytics_screen.dart';
import 'package:bahram_family_manager/features/comments/comments_screen.dart';
import 'package:bahram_family_manager/features/families/families_screen.dart';
import 'package:bahram_family_manager/features/home/home_screen.dart';
import 'package:bahram_family_manager/features/posts/posts_screen.dart';
import 'package:bahram_family_manager/features/settings/settings_screen.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';

class _Tab {
  const _Tab({required this.label, required this.icon, required this.builder, this.permission});

  final String label;
  final IconData icon;
  final WidgetBuilder builder;
  final String? permission;
}

class RootShell extends StatefulWidget {
  const RootShell({super.key});

  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  var _index = 0;

  static final _tabs = <_Tab>[
    _Tab(label: 'خانه', icon: Icons.dashboard_rounded, builder: (_) => const HomeScreen()),
    _Tab(
      label: 'پست‌ها',
      icon: Icons.campaign_rounded,
      builder: (_) => const PostsScreen(),
      permission: 'family.posts.create',
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
    _Tab(
      label: 'تحلیل',
      icon: Icons.insights_rounded,
      builder: (_) => const AnalyticsScreen(),
      permission: 'family.analytics.view',
    ),
    _Tab(
      label: 'برندینگ',
      icon: Icons.palette_rounded,
      builder: (_) => const SettingsScreen(),
      permission: 'family.settings.manage',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final visibleTabs = _tabs.where((t) {
      if (t.permission == null) return true;
      if (t.permission == 'family.settings.manage') {
        return (user?.can('family.settings.manage') ?? false) || (user?.can('family.stories.manage') ?? false);
      }
      return user?.can(t.permission!) ?? false;
    }).toList();

    if (visibleTabs.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('مدیر خانواده بهرام')),
        body: const EmptyState(
          icon: Icons.lock_outline_rounded,
          title: 'دسترسی ندارید',
          subtitle: 'حساب شما به مدیریت خانواده داداش بهرام دسترسی ندارد.\nبا مدیر کل تماس بگیرید.',
        ),
      );
    }

    final index = _index.clamp(0, visibleTabs.length - 1);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: visibleTabs[index].builder(context),
      bottomNavigationBar: visibleTabs.length == 1
          ? null
          : AppBottomNav(
              currentIndex: index,
              onTap: (i) => setState(() => _index = i),
              items: visibleTabs
                  .map((t) => AppBottomNavItem(label: t.label, icon: t.icon))
                  .toList(),
            ),
    );
  }
}
