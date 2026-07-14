import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/features/analytics/analytics_screen.dart';
import 'package:bahram_family_manager/features/comments/comments_screen.dart';
import 'package:bahram_family_manager/features/families/families_screen.dart';
import 'package:bahram_family_manager/features/home/home_screen.dart';
import 'package:bahram_family_manager/features/posts/posts_screen.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class _Tab {
  const _Tab({required this.label, required this.icon, required this.builder, this.permission});

  final String label;
  final IconData icon;
  final WidgetBuilder builder;
  final String? permission;
}

/// Bottom-nav shell — each tab is hidden unless the logged-in admin actually
/// has the matching `family.*` permission (super-admins see everything).
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
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final visibleTabs = _tabs.where((t) => t.permission == null || (user?.can(t.permission!) ?? false)).toList();

    if (visibleTabs.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('مدیر خانواده بهرام')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'حساب شما به مدیریت خانواده داداش بهرام دسترسی ندارد.\nبا مدیر کل تماس بگیرید.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted),
            ),
          ),
        ),
      );
    }

    final index = _index.clamp(0, visibleTabs.length - 1);

    return Scaffold(
      body: SafeArea(child: visibleTabs[index].builder(context)),
      bottomNavigationBar: visibleTabs.length == 1
          ? null
          : BottomNavigationBar(
              currentIndex: index,
              onTap: (i) => setState(() => _index = i),
              items: visibleTabs
                  .map((t) => BottomNavigationBarItem(icon: Icon(t.icon), label: t.label))
                  .toList(),
            ),
    );
  }
}
