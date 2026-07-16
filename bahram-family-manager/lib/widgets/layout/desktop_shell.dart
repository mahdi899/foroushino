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
import 'package:bahram_family_manager/widgets/navigation/quick_action_button.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

/// Shell for authenticated manager: bottom nav on mobile, Telegram-style sidebar on desktop.
class DesktopShell extends StatelessWidget {
  const DesktopShell({
    super.key,
    required this.currentIndex,
    required this.onIndexChanged,
    required this.items,
    required this.body,
    this.onComposePost,
  });

  final int currentIndex;
  final ValueChanged<int> onIndexChanged;
  final List<AppBottomNavItem> items;
  final Widget body;
  final VoidCallback? onComposePost;

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    if (!isDesktop) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        body: body,
        floatingActionButton: onComposePost == null
            ? null
            : Padding(
                padding: const EdgeInsets.only(bottom: 72),
                child: _MobileComposeFab(onPressed: onComposePost!),
              ),
        floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
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
      backgroundColor: Colors.transparent,
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
                onComposePost: onComposePost,
              ),
              const SizedBox(width: AppLayout.shellPadding),
              Expanded(
                child: GlassPanel(
                  borderRadius: AppLayout.contentPanelRadius,
                  blur: 28,
                  opacity: isDark ? 0.52 : 0.68,
                  child: Theme(
                    data: Theme.of(context).copyWith(
                      scaffoldBackgroundColor: Colors.transparent,
                      appBarTheme: Theme.of(context).appBarTheme.copyWith(
                            backgroundColor: Colors.transparent,
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

class _MobileComposeFab extends StatelessWidget {
  const _MobileComposeFab({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: AppGradients.primary,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppShadows.panelGlow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(18),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.edit_rounded, color: Colors.white, size: 22),
                SizedBox(width: 8),
                Text('پست جدید', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
              ],
            ),
          ),
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
    this.onComposePost,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<AppBottomNavItem> items;
  final String? userName;
  final VoidCallback onLogout;
  final VoidCallback? onComposePost;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return GlassPanel(
      borderRadius: AppLayout.contentPanelRadius,
      blur: 30,
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
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: scheme.onSurface.withValues(alpha: 0.55),
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (onComposePost != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
                child: ComposePostButton(
                  onPressed: onComposePost!,
                  expanded: false,
                  label: 'پست جدید',
                ),
              ),
            Divider(height: 1, color: scheme.outline.withValues(alpha: 0.45)),
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
            Divider(height: 1, color: scheme.outline.withValues(alpha: 0.45)),
            _SidebarUserFooter(
              userName: userName,
              onLogout: onLogout,
            ),
          ],
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
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.65);

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
              color: active ? scheme.primary.withValues(alpha: 0.14) : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.tile),
              border: active ? Border.all(color: scheme.primary.withValues(alpha: 0.25)) : null,
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
                    color: active ? Colors.white : scheme.primary,
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
                      color: active ? scheme.primary : muted,
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
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
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
            color: scheme.onSurface.withValues(alpha: 0.65),
            style: IconButton.styleFrom(
              backgroundColor: isDark ? AppColors.surfaceSoftDark.withValues(alpha: 0.6) : AppColors.surfaceSoft.withValues(alpha: 0.8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}
