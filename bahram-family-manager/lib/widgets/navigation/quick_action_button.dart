import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class QuickActionButton extends StatelessWidget {
  const QuickActionButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = AppColors.primary,
    this.expanded = true,
    this.vertical = true,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;
  final bool expanded;
  /// When true (home mobile chips): icon above label. When false: icon beside label (sidebar compose).
  final bool vertical;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final iconShell = Container(
      width: vertical ? 48 : 36,
      height: vertical ? 48 : 36,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withValues(alpha: 0.85), color],
        ),
        borderRadius: BorderRadius.circular(vertical ? 14 : 11),
        boxShadow: AppShadows.primaryGlow,
      ),
      child: Icon(icon, color: Colors.white, size: vertical ? 26 : 20),
    );

    final labelText = Text(
      label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      textAlign: vertical ? TextAlign.center : TextAlign.start,
      style: TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: vertical ? 12 : 13,
        color: scheme.onSurface,
      ),
    );

    final content = GlassPanel(
      borderRadius: 16,
      padding: EdgeInsets.symmetric(
        horizontal: vertical ? AppSpacing.sm : AppSpacing.md,
        vertical: vertical ? AppSpacing.sm + 2 : AppSpacing.md,
      ),
      onTap: onTap,
      child: vertical
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                iconShell,
                const SizedBox(height: 6),
                labelText,
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                iconShell,
                const SizedBox(width: AppSpacing.sm),
                Flexible(child: labelText),
              ],
            ),
    );

    if (!expanded) return content;
    return Expanded(child: content);
  }
}

class ComposePostButton extends StatelessWidget {
  const ComposePostButton({
    super.key,
    required this.onPressed,
    this.expanded = true,
    this.label = 'پست جدید',
  });

  final VoidCallback onPressed;
  final bool expanded;
  final String label;

  @override
  Widget build(BuildContext context) {
    return QuickActionButton(
      icon: Icons.edit_rounded,
      label: label,
      onTap: onPressed,
      color: AppColors.primary,
      expanded: expanded,
      vertical: false,
    );
  }
}
