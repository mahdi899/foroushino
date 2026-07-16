import 'dart:ui';

import 'package:flutter/material.dart';

import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/theme/theme_mode_toggle.dart';

/// Glass app bar with built-in theme toggle (hidden on desktop — sidebar has it).
class ManagerAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ManagerAppBar({
    super.key,
    required this.title,
    this.actions,
    this.bottom,
    this.showThemeToggle,
    this.themeToggleCompact = true,
    this.automaticallyImplyLeading = true,
  });

  final Widget title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final bool? showThemeToggle;
  final bool themeToggleCompact;
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
    final showToggle = showThemeToggle ?? !AppBreakpoints.isDesktop(context);

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
        child: AppBar(
          title: title,
          centerTitle: false,
          automaticallyImplyLeading: automaticallyImplyLeading,
          elevation: 0,
          scrolledUnderElevation: 0,
          surfaceTintColor: Colors.transparent,
          backgroundColor: scheme.surface.withValues(alpha: isDark ? 0.55 : 0.78),
          foregroundColor: scheme.onSurface,
          bottom: bottom,
          actions: [
            ...?actions,
            if (showToggle) ThemeModeToggleButton(compact: themeToggleCompact),
            const SizedBox(width: 4),
          ],
        ),
      ),
    );
  }
}
