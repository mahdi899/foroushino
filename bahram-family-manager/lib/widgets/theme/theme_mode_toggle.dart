import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/state/app_state.dart';

/// Dark/light switch for the app bar.
class ThemeModeToggleButton extends StatelessWidget {
  const ThemeModeToggleButton({
    super.key,
    this.compact = false,
    this.expanded = false,
  });

  final bool compact;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final scheme = Theme.of(context).colorScheme;
    final isDark = _isDark(context, state.themeMode);
    final accent = isDark ? AppColors.gold : AppColors.primary;

    final chip = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => state.toggleTheme(),
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: AppMotion.fast,
          curve: AppMotion.luxe,
          width: expanded ? double.infinity : null,
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 10 : 14,
            vertical: compact ? 8 : 10,
          ),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: isDark ? 0.28 : 0.16),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: accent.withValues(alpha: 0.65), width: 1.4),
            boxShadow: [
              BoxShadow(
                color: accent.withValues(alpha: 0.18),
                blurRadius: 12,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: expanded ? MainAxisAlignment.center : MainAxisAlignment.start,
            children: [
              Icon(
                isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                size: compact ? 18 : 20,
                color: accent,
              ),
              if (!compact) ...[
                const SizedBox(width: 8),
                Text(
                  isDark ? 'حالت روشن' : 'حالت تاریک',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: scheme.onSurface,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );

    if (!expanded) return chip;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: chip,
    );
  }

  static bool _isDark(BuildContext context, ThemeMode mode) {
    return switch (mode) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system => MediaQuery.platformBrightnessOf(context) == Brightness.dark,
    };
  }
}
