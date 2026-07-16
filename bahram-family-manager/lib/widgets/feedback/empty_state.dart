import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.icon = Icons.inbox_rounded,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: GlassPanel(
          borderRadius: AppRadius.card,
          blur: AppGlass.panelBlur,
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.14),
                  borderRadius: AppRadius.cardBorder,
                ),
                child: Icon(icon, size: 32, color: scheme.primary),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
              if (subtitle != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(subtitle!, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
              ],
              if (actionLabel != null && onAction != null) ...[
                const SizedBox(height: AppSpacing.lg),
                PrimaryButton(label: actionLabel!, onPressed: onAction, expand: false),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
