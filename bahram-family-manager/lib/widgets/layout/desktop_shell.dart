import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/branding/app_logo.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';

/// Shell for authenticated manager: bottom nav on mobile, Telegram-style sidebar on desktop.
class DesktopShell extends StatelessWidget {
  const DesktopShell({
    super.key,
    required this.currentIndex,
    required this.onIndexChanged,
    required this.items,
    required this.body,
  });

  final int currentIndex;
  final ValueChanged<int> onIndexChanged;
  final List<AppBottomNavItem> items;
  final Widget body;

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);

    if (!isDesktop) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: body,
        bottomNavigationBar: items.length <= 1
            ? null
            : AppBottomNav(
                currentIndex: currentIndex,
                onTap: onIndexChanged,
                items: items,
              ),
      );
    }

    final user = context.watch<AppState>().user;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppLayout.shellPadding),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _DesktopSidebar(
                currentIndex: currentIndex,
                onTap: onIndexChanged,
                items: items,
                userName: user?.name,
                onLogout: () => context.read<AppState>().logout(),
              ),
              const SizedBox(width: AppLayout.shellPadding),
              Expanded(
                child: _DesktopContentPanel(
                  child: Theme(
                    data: Theme.of(context).copyWith(
                      scaffoldBackgroundColor: Colors.transparent,
                      appBarTheme: Theme.of(context).appBarTheme.copyWith(
                            backgroundColor: AppColors.surface,
                            surfaceTintColor: Colors.transparent,
                            centerTitle: false,
                          ),
                    ),
                    child: body,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DesktopContentPanel extends StatelessWidget {
  const _DesktopContentPanel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox.expand(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppLayout.contentPanelRadius),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.06),
              blurRadius: 32,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppLayout.contentPanelRadius),
          child: child,
        ),
      ),
    );
  }
}

class _DesktopSidebar extends StatelessWidget {
  const _DesktopSidebar({
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.userName,
    required this.onLogout,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<AppBottomNavItem> items;
  final String? userName;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppLayout.contentPanelRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.96),
            borderRadius: BorderRadius.circular(AppLayout.contentPanelRadius),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.85)),
            boxShadow: AppShadows.soft,
          ),
          child: SizedBox(
            width: AppLayout.sidebarWidth,
            height: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.xl, AppSpacing.lg, AppSpacing.md),
                  child: Row(
                    children: [
                      const AppLogo(size: 44, showShadow: false),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              AppConfig.appName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'پنل مدیریت خانواده',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.textSubtle),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.md),
                    children: [
                      for (var i = 0; i < items.length; i++)
                        _SidebarNavItem(
                          item: items[i],
                          active: i == currentIndex,
                          onTap: () => onTap(i),
                        ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                _SidebarUserFooter(
                  userName: userName,
                  onLogout: onLogout,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SidebarNavItem extends StatelessWidget {
  const _SidebarNavItem({
    required this.item,
    required this.active,
    required this.onTap,
  });

  final AppBottomNavItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.tile),
          child: AnimatedContainer(
            duration: AppMotion.normal,
            curve: AppMotion.luxe,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm + 2),
            decoration: BoxDecoration(
              color: active ? AppColors.primarySoft : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.tile),
              border: active ? Border.all(color: AppColors.primary.withValues(alpha: 0.22)) : null,
            ),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: AppMotion.normal,
                  curve: AppMotion.luxe,
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    gradient: active ? AppGradients.primary : AppGradients.iconShell(),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: active ? AppShadows.primaryGlow : null,
                  ),
                  child: Icon(
                    item.icon,
                    size: 20,
                    color: active ? Colors.white : AppColors.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      color: active ? AppColors.primaryDark : AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SidebarUserFooter extends StatelessWidget {
  const _SidebarUserFooter({
    this.userName,
    required this.onLogout,
  });

  final String? userName;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final initial = userName?.isNotEmpty == true ? userName!.substring(0, 1) : 'ب';

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: AppGradients.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  userName ?? 'مدیر',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                const Text('آنلاین', style: TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'خروج',
            onPressed: onLogout,
            icon: const Icon(Icons.logout_rounded, size: 20),
            color: AppColors.textMuted,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surfaceSoft,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}
