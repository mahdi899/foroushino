import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

/// If the list does not scroll yet but more pages exist, fetch the next page.
void schedulePaginatedPrefetch({
  required ScrollController controller,
  required bool mounted,
  required bool hasMore,
  required bool loadingMore,
  required bool initialLoading,
  required VoidCallback loadMore,
}) {
  if (!mounted || !hasMore || loadingMore || initialLoading) return;

  SchedulerBinding.instance.addPostFrameCallback((_) {
    if (!mounted || !controller.hasClients) return;
    if (!hasMore || loadingMore || initialLoading) return;
    if (controller.position.maxScrollExtent <= 48) {
      loadMore();
    }
  });
}
