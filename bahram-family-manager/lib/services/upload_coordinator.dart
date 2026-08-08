import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/models/upload_progress.dart';
import 'package:bahram_family_manager/services/background_upload_keep_alive.dart';

/// One in-flight (or just-finished) upload, keyed by a stable [slot] so a
/// screen that gets disposed and rebuilt — tab switch, back-then-forward
/// navigation — can find it again with [UploadCoordinator.taskFor] instead of
/// losing track of it.
class UploadTask {
  UploadTask({
    required this.slot,
    required this.filename,
    required this.type,
  });

  final String slot;
  final String filename;
  final String type;

  /// The widget currently bound to this slot listens here instead of the
  /// coordinator needing to know about `BuildContext`/`setState` at all.
  final ValueNotifier<UploadProgress> progress = ValueNotifier(
    const UploadProgress(phase: MediaUploadPhase.uploading, sentBytes: 0, totalBytes: 0),
  );

  /// The last known state of the media as reported by the server. Set by the
  /// `job` closure passed to [UploadCoordinator.start] — both the final
  /// result and, for flows that poll `waitForMediaReady`, every intermediate
  /// update — so a bound screen can show a live thumbnail/duration before
  /// the pipeline marks it `ready`.
  FamilyMediaRef? media;

  /// Set once the job throws (network failure, cancellation, pipeline
  /// failure). Not necessarily fatal from the coordinator's point of view —
  /// [isDone] is what tells a screen the task is finished either way.
  Object? error;

  /// Cancels the underlying HTTP calls (best-effort — an already-sent chunk
  /// still completes server-side; only the in-flight request is aborted).
  final CancelToken cancelToken = CancelToken();

  final Completer<FamilyMediaRef> _done = Completer<FamilyMediaRef>();

  /// Completes with the ready media, or errors when the job fails / is cancelled.
  Future<FamilyMediaRef> get whenDone => _done.future;

  /// Reports new progress and, via the [progress] listener the coordinator
  /// attaches in [UploadCoordinator.start], keeps the background keep-alive
  /// notification in sync. Always creates a new [UploadProgress] instance so
  /// `ValueNotifier` reliably notifies listeners.
  void reportProgress(UploadProgress upload) => progress.value = upload;

  void completeOk(FamilyMediaRef result) {
    media = result;
    if (!_done.isCompleted) _done.complete(result);
  }

  void completeError(Object err) {
    error = err;
    if (!_done.isCompleted) _done.completeError(err);
  }

  bool get isDone =>
      error != null ||
      progress.value.phase == MediaUploadPhase.ready ||
      progress.value.phase == MediaUploadPhase.failed ||
      _done.isCompleted;
  bool get isReady => media?.isReady ?? false;
  bool get isCancelled => cancelToken.isCancelled;

  void dispose() => progress.dispose();
}

/// Runs media uploads independently of any widget's lifetime, so switching
/// tabs, navigating away from the editor, or the app moving to the
/// background does not cancel or orphan an in-flight upload.
///
/// Owned by `AppState`, which outlives every screen — the `Future` chain for
/// each upload (`FamilyManagerService.uploadMedia` → `waitForMediaReady`)
/// lives here, not inside a `State.setState` closure. Screens only start a
/// task and subscribe to its [UploadTask.progress]; they never own the
/// `Future` itself.
class UploadCoordinator extends ChangeNotifier {
  UploadCoordinator({BackgroundUploadKeepAlive? keepAlive})
      : _keepAlive = keepAlive ?? BackgroundUploadKeepAlive();

  final BackgroundUploadKeepAlive _keepAlive;
  final Map<String, UploadTask> _tasks = {};

  /// Used by settings to request OEM battery-optimization exemption.
  BackgroundUploadKeepAlive get keepAlive => _keepAlive;

  /// Snapshot of the post draft (text/type/audience/etc.) saved by the post
  /// editor when the user chooses "continue in background" while leaving
  /// mid-upload — consumed the next time a post editor mounts for a new
  /// post. Deliberately untyped here to keep this service free of any
  /// screen-specific model; the screen owns encoding/decoding it.
  Map<String, dynamic>? pendingPostDraft;

  /// Finds the task for [slot] — non-null while an upload is running or has
  /// just finished (until [forget] is called), so a screen can rebind to it
  /// in `initState` after being recreated mid-upload.
  UploadTask? taskFor(String slot) => _tasks[slot];

  bool get hasActive => _tasks.values.any((t) => !t.isDone);

  int get activeCount => _tasks.values.where((t) => !t.isDone).length;

  /// Starts [job] under [slot], replacing whatever task was previously there
  /// (e.g. a finished/failed one the screen hadn't [forget]ten yet).
  ///
  /// [job] must perform the actual upload — call
  /// `FamilyManagerService.uploadMedia(...)` then, if needed,
  /// `waitForMediaReady(...)` — using the given [UploadTask] to report
  /// progress (`task.reportProgress`), intermediate media state
  /// (`task.media = ...`) and cancellation (`task.cancelToken`).
  UploadTask start({
    required String slot,
    required String filename,
    required String type,
    required Future<FamilyMediaRef> Function(UploadTask task) job,
  }) {
    final previous = _tasks.remove(slot);
    if (previous != null) {
      previous.cancelToken.cancel('replaced');
      if (!previous.isDone) {
        previous.completeError(StateError('upload_replaced'));
      }
      previous.dispose();
    }
    final task = UploadTask(slot: slot, filename: filename, type: type);
    task.progress.addListener(_syncKeepAlive);
    _tasks[slot] = task;
    notifyListeners();
    _syncKeepAlive();

    unawaited(_run(task, job));
    return task;
  }

  Future<void> _run(UploadTask task, Future<FamilyMediaRef> Function(UploadTask) job) async {
    try {
      final media = await job(task);
      task.completeOk(media);
      if (task.progress.value.phase != MediaUploadPhase.ready) {
        task.reportProgress(UploadProgress(
          phase: MediaUploadPhase.ready,
          sentBytes: task.progress.value.totalBytes,
          totalBytes: task.progress.value.totalBytes,
        ));
      }
    } catch (e) {
      task.completeError(e);
      if (task.progress.value.phase != MediaUploadPhase.failed) {
        task.reportProgress(task.progress.value.copyWith(phase: MediaUploadPhase.failed));
      }
    } finally {
      notifyListeners();
      _syncKeepAlive();
    }
  }

  /// Requests cancellation of [slot]'s in-flight upload. The task stays
  /// queryable via [taskFor] with [UploadTask.error] set once the cancelled
  /// request unwinds — call [forget] to drop it from the map.
  void cancel(String slot) {
    _tasks[slot]?.cancelToken.cancel('user_cancelled');
  }

  void cancelAll() {
    for (final task in _tasks.values) {
      task.cancelToken.cancel('logout');
      task.dispose();
    }
    _tasks.clear();
    pendingPostDraft = null;
    notifyListeners();
    _syncKeepAlive();
  }

  /// Drops a finished/failed task once the UI has consumed its result (e.g.
  /// after attaching the ready media to the post draft, or after showing the
  /// failure snackbar).
  void forget(String slot) {
    final removed = _tasks.remove(slot);
    removed?.dispose();
    notifyListeners();
    _syncKeepAlive();
  }

  void _syncKeepAlive() {
    unawaited(_keepAlive.onActiveUploadsChanged(activeCount, _summaryText()));
  }

  String? _summaryText() {
    final active = _tasks.values.where((t) => !t.isDone).toList();
    if (active.isEmpty) return null;
    if (active.length == 1) {
      final task = active.first;
      final percent = (task.progress.value.fraction * 100).clamp(0, 100).round();
      final label = task.progress.value.phase == MediaUploadPhase.uploading
          ? '$percent٪'
          : 'در حال آماده‌سازی…';
      return '${task.filename} — $label';
    }
    return '${active.length} فایل در حال آپلود';
  }

  @override
  void dispose() {
    for (final task in _tasks.values) {
      task.dispose();
    }
    super.dispose();
  }
}
