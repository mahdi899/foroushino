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
  final isNarrow = MediaQuery.sizeOf(context).width < 900;
  final resolvedInitial = scrollable && isNarrow
      ? initialChildSize.clamp(0.75, 0.95)
      : initialChildSize;

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
      final scheme = Theme.of(context).colorScheme;

      Widget header() => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: scheme.outline.withValues(alpha: 0.45),
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
            ],
          );

      if (scrollable) {
        return Padding(
          padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top + AppSpacing.md),
          child: DraggableScrollableSheet(
            initialChildSize: resolvedInitial.toDouble(),
            minChildSize: isNarrow ? 0.55 : 0.35,
            maxChildSize: 0.96,
            expand: false,
            builder: (context, scrollController) {
              return ClipRRect(
                borderRadius: AppRadius.sheetBorder,
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: AppGlass.sheetBlur, sigmaY: AppGlass.sheetBlur),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: scheme.surface.withValues(alpha: scheme.brightness == Brightness.dark ? 0.92 : 0.96),
                      borderRadius: AppRadius.sheetBorder,
                      border: Border.all(color: scheme.outline.withValues(alpha: 0.35)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 0),
                          child: header(),
                        ),
                        Expanded(
                          child: SingleChildScrollView(
                            controller: scrollController,
                            padding: EdgeInsets.fromLTRB(
                              AppSpacing.lg,
                              0,
                              AppSpacing.lg,
                              bottomInset + AppSpacing.xl,
                            ),
                            child: child,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      }

      return Padding(
        padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top + AppSpacing.xl),
        child: GlassPanel(
          borderRadius: AppRadius.sheet,
          blur: AppGlass.sheetBlur,
          padding: EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, bottomInset + AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header(),
              child,
            ],
          ),
        ),
      );
    },
  );
}
