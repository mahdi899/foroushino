import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

/// Telegram-style glass card — delegates to [GlassPanel].
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.onTap,
    this.color,
    this.borderColor,
    this.margin,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final Color? borderColor;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      borderRadius: AppRadius.card,
      blur: AppGlass.panelBlur,
      opacity: color != null ? null : AppGlass.panelOpacity(Theme.of(context).colorScheme.brightness),
      padding: padding,
      margin: margin,
      onTap: onTap,
      child: child,
    );
  }
}
