import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';

/// Breakpoints and helpers for web/desktop layout.
class AppBreakpoints {
  AppBreakpoints._();

  static const double tablet = 600;
  static const double desktop = 900;
  static const double wide = 1200;

  /// Max width for main content column on large screens.
  static const double contentMaxWidth = 1080;

  static const double listPaneWidth = 360;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= desktop;

  static bool isTablet(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= tablet;

  static int gridColumns(BuildContext context, {int mobile = 2, int tablet = 3, int desktop = 4}) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= AppBreakpoints.desktop) return desktop;
    if (width >= AppBreakpoints.tablet) return tablet;
    return mobile;
  }

  /// Taller cells avoid StatCard overflow on dense 4-column grids.
  static double statCardAspectRatio(BuildContext context) {
    final columns = gridColumns(context);
    if (columns >= 4) return 1.28;
    if (columns >= 3) return 1.22;
    return 1.18;
  }

  static EdgeInsets pagePadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= AppBreakpoints.wide) {
      return const EdgeInsets.symmetric(horizontal: AppSpacing.xxl, vertical: AppSpacing.lg);
    }
    if (width >= AppBreakpoints.desktop) {
      return const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg);
    }
    return const EdgeInsets.all(AppSpacing.lg);
  }

  /// Matches [AppBottomNav] inner height when labels are shown.
  static const double shellBottomNavHeight = 62;

  /// Extra scroll space below a fixed editor action bar ([PostEditorActionBar]).
  static const double editorActionBarInset = 88;

  /// Scroll padding for tab bodies inside [RootShell] (clears mobile bottom nav).
  static EdgeInsets shellTabPadding(BuildContext context, {double extraBottom = 0}) {
    final base = pagePadding(context);
    if (isDesktop(context)) {
      return base.copyWith(bottom: base.bottom + extraBottom);
    }
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    return base.copyWith(
      bottom: base.bottom + shellBottomNavHeight + bottomInset + extraBottom,
    );
  }

  /// Scroll padding for pushed/detail screens without shell bottom nav.
  static EdgeInsets scrollPadding(BuildContext context, {double extraBottom = 0}) {
    final base = pagePadding(context);
    if (isDesktop(context)) {
      return base.copyWith(bottom: base.bottom + extraBottom);
    }
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    return base.copyWith(bottom: base.bottom + bottomInset + extraBottom);
  }

  /// Post editor and similar screens with a bottom action bar overlay.
  static EdgeInsets editorScrollPadding(BuildContext context) {
    return scrollPadding(context, extraBottom: editorActionBarInset);
  }
}

/// Centers content and caps width on desktop/web.
class ResponsiveContent extends StatelessWidget {
  const ResponsiveContent({
    super.key,
    required this.child,
    this.maxWidth = AppBreakpoints.contentMaxWidth,
    this.padding,
    this.alignment = Alignment.topCenter,
  });

  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry? padding;
  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context) {
    final resolvedPadding = padding ?? AppBreakpoints.pagePadding(context);

    return Align(
      alignment: alignment,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: resolvedPadding,
          child: child,
        ),
      ),
    );
  }
}

/// Wraps a full-screen tab body: fills height, constrains width on wide viewports.
class ResponsivePageBody extends StatelessWidget {
  const ResponsivePageBody({
    super.key,
    required this.child,
    this.maxWidth = AppBreakpoints.contentMaxWidth,
  });

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= AppBreakpoints.desktop;

        if (!isWide) {
          return child;
        }

        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: child,
          ),
        );
      },
    );
  }
}
