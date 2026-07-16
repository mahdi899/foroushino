import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class ThemeModeToggleButton extends StatelessWidget {
  const ThemeModeToggleButton({
    super.key,
    this.compact = false,
  });

  final bool compact;

  @override
  Widget build(BuildContext context) {
    context.watch<AppState>();
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: compact ? 2 : 6, vertical: compact ? 0 : 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.read<AppState>().toggleTheme(context),
          borderRadius: BorderRadius.circular(20),
          child: AnimatedContainer(
            duration: AppMotion.fast,
            curve: AppMotion.luxe,
            padding: EdgeInsets.symmetric(horizontal: compact ? 10 : 12, vertical: compact ? 7 : 8),
            decoration: BoxDecoration(
              color: (isDark ? AppColors.gold : AppColors.primary).withValues(alpha: isDark ? 0.22 : 0.14),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: (isDark ? AppColors.gold : AppColors.primary).withValues(alpha: isDark ? 0.55 : 0.28),
                width: 1.2,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedSwitcher(
                  duration: AppMotion.fast,
                  child: Icon(
                    isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                    key: ValueKey(isDark),
                    size: compact ? 18 : 20,
                    color: isDark ? AppColors.gold : AppColors.primary,
                  ),
                ),
                if (!compact) ...[
                  const SizedBox(width: 6),
                  Text(
                    isDark ? 'روشن' : 'تاریک',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.gold : AppColors.primary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
