import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';

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
    backgroundColor: AppColors.surface,
    barrierColor: AppColors.scrim,
    showDragHandle: true,
    shape: RoundedRectangleBorder(borderRadius: AppRadius.sheetBorder),
    builder: (context) {
      final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
      final content = Padding(
        padding: EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, bottomInset + AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: AppSpacing.lg),
            if (scrollable)
              Flexible(
                child: child,
              )
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
            return SingleChildScrollView(
              controller: scrollController,
              child: content,
            );
          },
        );
      }

      return content;
    },
  );
}
