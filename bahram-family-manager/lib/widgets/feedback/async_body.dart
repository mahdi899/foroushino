import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';

class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({
    super.key,
    required this.snapshot,
    required this.builder,
    this.loading,
    this.emptyMessage = 'موردی یافت نشد.',
    this.emptyIcon = Icons.inbox_rounded,
  });

  final AsyncSnapshot<T> snapshot;
  final Widget Function(BuildContext context, T data) builder;
  final Widget? loading;
  final String emptyMessage;
  final IconData emptyIcon;

  @override
  Widget build(BuildContext context) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return loading ??
          const Center(
            child: Padding(
              padding: EdgeInsets.all(AppSpacing.xxl),
              child: CircularProgressIndicator(),
            ),
          );
    }

    if (snapshot.hasError) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          EmptyState(
            icon: Icons.error_outline_rounded,
            title: 'خطا در بارگذاری',
            subtitle: messageOf(snapshot.error!),
          ),
        ],
      );
    }

    final data = snapshot.data;
    if (data == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [EmptyState(title: emptyMessage, icon: emptyIcon)],
      );
    }

    return builder(context, data);
  }
}
