import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

/// Panel-style gradient surface (student panel feature cards in light mode).
class PanelGradientCard extends StatelessWidget {
  const PanelGradientCard({
    super.key,
    required this.child,
    this.variant = PanelGradientVariant.teal,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.onTap,
  });

  final Widget child;
  final PanelGradientVariant variant;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  LinearGradient _resolveGradient(BuildContext context) => switch (variant) {
        PanelGradientVariant.teal => const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF004A52), Color(0xFF007F88), Color(0xFF0099A3), Color(0xFF003B40)],
            stops: [0.0, 0.34, 0.58, 1.0],
          ),
        PanelGradientVariant.gold => const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF7A5200), Color(0xFFC9930A), Color(0xFFFFB000), Color(0xFF5C3D00)],
            stops: [0.0, 0.32, 0.54, 1.0],
          ),
        PanelGradientVariant.soft => LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [
              AppColors.accent.withValues(alpha: 0.14),
              Theme.of(context).colorScheme.surface.withValues(alpha: 0.9),
              AppColors.primarySoft.withValues(alpha: 0.35),
            ],
          ),
      };

  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        gradient: _resolveGradient(context),
        borderRadius: AppRadius.cardBorder,
        boxShadow: AppShadows.panelGlow,
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
      ),
      child: Padding(padding: padding, child: child),
    );

    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, borderRadius: AppRadius.cardBorder, child: card),
    );
  }
}

enum PanelGradientVariant { teal, gold, soft }

class PanelSectionCard extends StatelessWidget {
  const PanelSectionCard({
    super.key,
    required this.title,
    required this.child,
    this.icon,
    this.trailing,
  });

  final String title;
  final Widget child;
  final IconData? icon;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    return GlassPanel(
      borderRadius: 20,
      blur: 24,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.04)
                  : Colors.white.withValues(alpha: 0.35),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(19)),
              border: Border(
                bottom: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : Colors.white.withValues(alpha: 0.45),
                ),
              ),
            ),
            child: Row(
              children: [
                if (icon != null) ...[
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      gradient: AppGradients.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: AppSpacing.md),
                ],
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: child,
          ),
        ],
      ),
    );
  }
}
