import 'package:flutter/material.dart';

import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';

/// Scaffold that blends into the desktop content panel (transparent bg on wide viewports).
class AdaptiveScaffold extends StatelessWidget {
  const AdaptiveScaffold({
    super.key,
    this.appBar,
    required this.body,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.bottomNavigationBar,
    this.extendBody = false,
    this.backgroundColor,
  });

  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;
  final Widget? bottomNavigationBar;
  final bool extendBody;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);

    return Scaffold(
      backgroundColor: isDesktop ? Colors.transparent : (backgroundColor ?? Theme.of(context).scaffoldBackgroundColor),
      extendBody: extendBody,
      appBar: appBar,
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SizedBox(
            width: constraints.maxWidth,
            height: constraints.maxHeight.isFinite ? constraints.maxHeight : null,
            child: body,
          );
        },
      ),
      floatingActionButton: floatingActionButton,
      floatingActionButtonLocation: floatingActionButtonLocation,
      bottomNavigationBar: bottomNavigationBar,
    );
  }
}
