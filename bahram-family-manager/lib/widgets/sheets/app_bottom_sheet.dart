import 'dart:ui';

import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

Future<T?> showAppBottomSheet<T>({
  required BuildContext context,
  required String title,
  required Widget child,
  String? subtitle,
  bool scrollable = false,
  double initialChildSize = 0.6,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Theme.of(context).brightness == Brightness.dark
        ? const Color(0xCC000000)
        : AppColors.scrim,
    showDragHandle: false,
    builder: (context) {
      final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
      final content = GlassPanel(
        borderRadius: AppRadius.sheet,
        blur: AppGlass.sheetBlur,
        padding: EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, bottomInset + AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
            ),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: AppSpacing.lg),
            if (scrollable)
              Flexible(child: child)
            else
              child,
          ],
        ),
      );

      if (scrollable) {
        return DraggableScrollableSheet(
          initialChildSize: initialChildSize,
          minChildSize: 0.35,
          maxChildSize: 0.92,
          expand: false,
          builder: (context, scrollController) {
            return ClipRRect(
              borderRadius: AppRadius.sheetBorder,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: AppGlass.sheetBlur, sigmaY: AppGlass.sheetBlur),
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: content,
                ),
              ),
            );
          },
        );
      }

      return Padding(
        padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top + AppSpacing.xl),
        child: content,
      );
    },
  );
}
