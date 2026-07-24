import 'dart:ui';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/features/settings/app_settings_hub_screen.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/theme/theme_mode_toggle.dart';

class ManagerAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ManagerAppBar({
    super.key,
    required this.title,
    this.actions,
    this.bottom,
    this.showThemeToggle = false,
    this.themeToggleCompact = true,
    /// On mobile primary tabs: settings + logout like home header.
    this.showShellActions = false,
    this.automaticallyImplyLeading = true,
  });

  final Widget title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final bool showThemeToggle;
  final bool themeToggleCompact;
  final bool showShellActions;
  final bool automaticallyImplyLeading;

  @override
  Size get preferredSize {
    final bottomHeight = bottom?.preferredSize.height ?? 0;
    return Size.fromHeight(kToolbarHeight + bottomHeight);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
    final isDesktop = AppBreakpoints.isDesktop(context);

    final bar = AppBar(
      title: title,
      centerTitle: false,
      automaticallyImplyLeading: automaticallyImplyLeading,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      backgroundColor: scheme.surface.withValues(alpha: kIsWeb ? 0.96 : (isDark ? 0.55 : 0.78)),
      foregroundColor: scheme.onSurface,
      bottom: bottom,
      actions: [
        ...?actions,
        if (showShellActions && !isDesktop) ...[
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AppSettingsHubScreen()),
            ),
            icon: const Icon(Icons.settings_rounded),
            tooltip: 'تنظیمات',
          ),
          IconButton(
            onPressed: () => context.read<AppState>().logout(),
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'خروج',
          ),
        ],
        if (showThemeToggle) ThemeModeToggleButton(compact: themeToggleCompact),
        const SizedBox(width: 4),
      ],
    );

    if (kIsWeb) {
      return RepaintBoundary(child: bar);
    }

    return RepaintBoundary(
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
          child: bar,
        ),
      ),
    );
  }
}
