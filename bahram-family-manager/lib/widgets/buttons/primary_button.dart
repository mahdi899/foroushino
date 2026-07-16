import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.icon,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(label),
            ],
          );

    final button = DecoratedBox(
      decoration: BoxDecoration(
        gradient: onPressed == null ? null : AppGradients.primary,
        color: onPressed == null ? AppColors.border : null,
        borderRadius: AppRadius.tileBorder,
        boxShadow: onPressed == null ? null : AppShadows.primaryGlow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: loading ? null : onPressed,
          borderRadius: AppRadius.tileBorder,
          child: Container(
            constraints: BoxConstraints(minHeight: 48, minWidth: expand ? double.infinity : 0),
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
            alignment: Alignment.center,
            child: DefaultTextStyle(
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
              child: child,
            ),
          ),
        ),
      ),
    );

    return button;
  }
}

class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        backgroundColor: scheme.surface.withValues(alpha: isDark ? 0.5 : 0.7),
        foregroundColor: scheme.onSurface,
        side: BorderSide(color: scheme.outline.withValues(alpha: 0.75)),
        minimumSize: expand ? const Size.fromHeight(48) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 20),
            const SizedBox(width: AppSpacing.sm),
          ],
          Text(label),
        ],
      ),
    );
  }
}

class GradientFab extends StatelessWidget {
  const GradientFab({
    super.key,
    required this.onPressed,
    this.label,
    this.icon = Icons.add_rounded,
  });

  final VoidCallback onPressed;
  final String? label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final child = label == null
        ? Icon(icon)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: AppSpacing.sm),
              Text(label!, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          );

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: AppGradients.primary,
        borderRadius: BorderRadius.circular(label == null ? 16 : AppRadius.pill),
        boxShadow: AppShadows.primaryGlow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(label == null ? 16 : AppRadius.pill),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: label == null ? 16 : 20,
              vertical: label == null ? 16 : 14,
            ),
            child: DefaultTextStyle(
              style: const TextStyle(color: Colors.white),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
