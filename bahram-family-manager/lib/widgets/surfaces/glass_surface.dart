import 'dart:ui';

import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';

/// Telegram-style frosted glass panel.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.borderRadius = AppLayout.contentPanelRadius,
    this.padding,
    this.margin,
    this.blur = AppGlass.panelBlur,
    this.opacity,
    this.onTap,
  });

  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double blur;
  final double? opacity;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
    final fillOpacity = opacity ?? AppGlass.panelOpacity(scheme.brightness);
    final borderColor = blur > 0
        ? (isDark ? Colors.white.withValues(alpha: 0.1) : Colors.white.withValues(alpha: 0.55))
        : (isDark ? AppColors.borderDark : AppColors.border);

    final decoration = BoxDecoration(
      color: scheme.surface.withValues(alpha: blur > 0 ? fillOpacity : (opacity ?? 1)),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: borderColor),
      boxShadow: blur > 0
          ? [
              BoxShadow(
                color: (isDark ? Colors.black : AppColors.primaryDark).withValues(alpha: isDark ? 0.22 : 0.05),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ]
          : null,
    );

    final panel = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: blur > 0
          ? BackdropFilter(
              filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
              child: DecoratedBox(
                decoration: decoration,
                child: padding != null ? Padding(padding: padding!, child: child) : child,
              ),
            )
          : DecoratedBox(
              decoration: decoration,
              child: padding != null ? Padding(padding: padding!, child: child) : child,
            ),
    );

    if (onTap == null) {
      return margin != null ? Padding(padding: margin!, child: panel) : panel;
    }

    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: panel,
        ),
      ),
    );
  }
}
