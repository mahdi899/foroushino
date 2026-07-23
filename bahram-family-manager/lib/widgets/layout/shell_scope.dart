import 'package:flutter/material.dart';

/// Lets child screens jump between shell tabs or trigger compose without tight coupling.
class ShellScope extends InheritedWidget {
  const ShellScope({
    super.key,
    required this.goToTab,
    this.onComposePost,
    this.onComposeStory,
    this.tabLabels,
    required super.child,
  });

  final void Function(int index) goToTab;
  final VoidCallback? onComposePost;
  final VoidCallback? onComposeStory;
  final List<String>? tabLabels;

  int? indexOfLabel(String label) {
    final labels = tabLabels;
    if (labels == null) return null;
    return labels.indexOf(label);
  }

  void goToLabel(String label) {
    final i = indexOfLabel(label);
    if (i != null && i >= 0) goToTab(i);
  }

  static ShellScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ShellScope>();

  @override
  bool updateShouldNotify(ShellScope oldWidget) =>
      oldWidget.goToTab != goToTab ||
      oldWidget.onComposePost != onComposePost ||
      oldWidget.onComposeStory != onComposeStory;
}
