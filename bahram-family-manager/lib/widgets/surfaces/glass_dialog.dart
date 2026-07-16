import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

Future<T?> showGlassDialog<T>({
  required BuildContext context,
  required String title,
  required Widget content,
  List<Widget>? actions,
}) {
  return showDialog<T>(
    context: context,
    barrierColor: Theme.of(context).brightness == Brightness.dark
        ? const Color(0xCC000000)
        : const Color(0x8C050A0B),
    builder: (context) => Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
      child: GlassPanel(
        borderRadius: AppRadius.card,
        blur: AppGlass.sheetBlur,
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.md),
            content,
            if (actions != null && actions.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: actions,
              ),
            ],
          ],
        ),
      ),
    ),
  );
}
