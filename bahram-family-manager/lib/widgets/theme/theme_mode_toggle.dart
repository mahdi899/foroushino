import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/state/app_state.dart';

class ThemeModeToggleButton extends StatelessWidget {
  const ThemeModeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    context.watch<AppState>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IconButton(
      tooltip: isDark ? 'حالت روشن' : 'حالت تاریک',
      onPressed: () => context.read<AppState>().toggleTheme(context),
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: Icon(
          isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
          key: ValueKey(isDark),
        ),
      ),
    );
  }
}
