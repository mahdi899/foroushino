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
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final content = GlassPanel(
      borderRadius: 16,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
      onTap: onTap,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withValues(alpha: 0.85), color],
              ),
              borderRadius: BorderRadius.circular(11),
              boxShadow: AppShadows.primaryGlow,
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          const SizedBox(width: AppSpacing.sm),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: scheme.onSurface,
              ),
            ),
          ),
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
    );
  }
}
