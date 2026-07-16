import 'dart:ui';

import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';

class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<AppBottomNavItem> items;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 380 || items.length > 5;
    final showLabels = !compact || width >= 340;

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.92),
            border: Border(
              top: BorderSide(color: scheme.primary.withValues(alpha: 0.1)),
            ),
            boxShadow: [
              BoxShadow(
                color: (isDark ? Colors.black : AppColors.primaryDark).withValues(alpha: isDark ? 0.28 : 0.07),
                blurRadius: 20,
                offset: const Offset(0, -6),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: showLabels ? 62 : 56,
              child: Row(
                children: List.generate(items.length, (index) {
                  final item = items[index];
                  final active = index == currentIndex;
                  return Expanded(
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => onTap(index),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _NavIconShell(icon: item.icon, active: active, compact: compact),
                            if (showLabels) ...[
                              const SizedBox(height: 3),
                              Text(
                                item.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: compact ? 10 : 11,
                                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                                  color: active ? scheme.primary : scheme.onSurface.withValues(alpha: 0.55),
                                  height: 1.1,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppBottomNavItem {
  const AppBottomNavItem({required this.label, required this.icon});

  final String label;
  final IconData icon;
}

class _NavIconShell extends StatelessWidget {
  const _NavIconShell({required this.icon, required this.active, this.compact = false});

  final IconData icon;
  final bool active;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final size = compact ? 30.0 : 34.0;
    final iconSize = compact ? 18.0 : 20.0;

    return AnimatedContainer(
      duration: AppMotion.normal,
      curve: AppMotion.luxe,
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: active ? AppGradients.primary : null,
        color: active ? null : scheme.surface.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(compact ? 10 : AppRadius.tile),
        border: active ? null : Border.all(color: scheme.outline.withValues(alpha: 0.6)),
        boxShadow: active ? AppShadows.primaryGlow : null,
      ),
      child: Icon(icon, size: iconSize, color: active ? Colors.white : scheme.primary),
    );
  }
}

class AppTabBar extends StatelessWidget implements PreferredSizeWidget {
  const AppTabBar({
    super.key,
    required this.controller,
    required this.tabs,
    this.isScrollable = false,
  });

  final TabController controller;
  final List<String> tabs;
  final bool isScrollable;

  @override
  Size get preferredSize => const Size.fromHeight(52);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.sm),
      color: scheme.surface.withValues(alpha: isDark ? 0.35 : 0.45),
      child: TabBar(
        controller: controller,
        isScrollable: isScrollable,
        tabAlignment: isScrollable ? TabAlignment.start : TabAlignment.fill,
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        splashBorderRadius: BorderRadius.circular(10),
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: scheme.primary.withValues(alpha: 0.14),
          border: Border.all(color: scheme.primary.withValues(alpha: 0.28)),
        ),
        labelColor: scheme.primary,
        unselectedLabelColor: scheme.onSurface.withValues(alpha: 0.55),
        labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
        labelPadding: const EdgeInsets.symmetric(horizontal: 4),
        tabs: tabs.map((t) => Tab(height: 36, text: t)).toList(),
      ),
    );
  }
}
