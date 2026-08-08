import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';

/// Keeps the process alive on Android while a video/voice upload is in
/// flight, so switching tabs/apps (while the app stays in the recents list)
/// does not get the process frozen or killed under memory pressure.
///
/// This intentionally never registers a [TaskHandler]/`callback` — the goal
/// is only a persistent notification + `dataSync` foreground service type so
/// the OS treats the process as actively working, not to run the upload on a
/// second isolate. The upload itself keeps running on the main isolate via
/// `UploadCoordinator`, which already owns the Dio client / auth token.
///
/// No-op on iOS, web and desktop: those don't get a foreground-service
/// keep-alive, matching Level 1 scope (Android only).
class BackgroundUploadKeepAlive {
  static const _channelId = 'family_manager_upload';
  static const _serviceId = 4201;
  static const _minUpdateInterval = Duration(seconds: 1);

  bool _initialized = false;
  bool _running = false;
  /// Prevents [onActiveUploadsChanged] from tearing down the notification
  /// while [announceCompletion] is still showing the final status.
  bool _holdingForAnnouncement = false;
  String? _lastText;
  DateTime? _lastUpdateAt;

  bool get _supported => !kIsWeb && Platform.isAndroid;

  void _ensureInitialized() {
    if (!_supported || _initialized) return;
    _initialized = true;
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: _channelId,
        channelName: 'آپلود رسانه',
        channelDescription: 'وقتی ویدیو یا صدایی در حال آپلود است این اعلان نمایش داده می‌شود.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
        onlyAlertOnce: true,
        showWhen: false,
        showBadge: false,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: false,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.nothing(),
        autoRunOnBoot: false,
        autoRunOnMyPackageReplaced: false,
        allowWakeLock: true,
        allowWifiLock: true,
        // The service already stops with the task via the manifest tag; keep
        // this explicit too in case the plugin default ever changes.
        stopWithTask: true,
      ),
    );
  }

  /// Called by [UploadCoordinator] whenever the number of in-flight uploads
  /// or the aggregate progress text changes. Safe to call frequently — the
  /// notification text update is throttled internally.
  Future<void> onActiveUploadsChanged(int activeCount, String? summaryText) async {
    if (!_supported) return;
    _ensureInitialized();

    if (activeCount <= 0) {
      if (_holdingForAnnouncement) return;
      await _stop();
      return;
    }

    final text = summaryText ?? 'در حال آپلود…';
    if (!_running) {
      await _start(text);
      return;
    }

    final now = DateTime.now();
    final tooSoon = _lastUpdateAt != null && now.difference(_lastUpdateAt!) < _minUpdateInterval;
    if (text == _lastText || tooSoon) return;

    _lastText = text;
    _lastUpdateAt = now;
    try {
      await FlutterForegroundTask.updateService(
        notificationTitle: 'آپلود رسانه',
        notificationText: text,
      );
    } catch (_) {
      // Best-effort — the upload itself doesn't depend on the notification.
    }
  }

  Future<void> _start(String text) async {
    _running = true;
    _lastText = text;
    _lastUpdateAt = DateTime.now();
    try {
      await _requestNotificationPermission();
      final result = await FlutterForegroundTask.startService(
        serviceId: _serviceId,
        serviceTypes: const [ForegroundServiceTypes.dataSync],
        notificationTitle: 'آپلود رسانه',
        notificationText: text,
      );
      if (result is ServiceRequestFailure) {
        // Notification permission denied, service already running from a
        // previous session, etc. — upload continues in foreground either way.
        _running = false;
      }
    } catch (_) {
      _running = false;
    }
  }

  Future<void> _stop() async {
    if (!_running) return;
    _running = false;
    _lastText = null;
    _lastUpdateAt = null;
    try {
      await FlutterForegroundTask.stopService();
    } catch (_) {
      // Ignore — nothing to clean up if it was never actually running.
    }
  }

  /// Shows a brief completion/failure line in the upload notification, then
  /// stops the foreground service so the user knows background work finished.
  Future<void> announceCompletion(String text, {required bool success}) async {
    if (!_supported) return;
    _holdingForAnnouncement = true;
    _ensureInitialized();
    try {
      await _requestNotificationPermission();
      if (_running) {
        await FlutterForegroundTask.updateService(
          notificationTitle: success ? 'آپلود تمام شد' : 'آپلود ناموفق',
          notificationText: text,
        );
      } else {
        final result = await FlutterForegroundTask.startService(
          serviceId: _serviceId,
          serviceTypes: const [ForegroundServiceTypes.dataSync],
          notificationTitle: success ? 'آپلود تمام شد' : 'آپلود ناموفق',
          notificationText: text,
        );
        if (result is ServiceRequestFailure) return;
        _running = true;
      }
      await Future<void>.delayed(const Duration(seconds: 2));
    } catch (_) {
      // Best-effort notification only.
    } finally {
      _holdingForAnnouncement = false;
      await _stop();
    }
  }

  Future<void> _requestNotificationPermission() async {
    try {
      final permission = await FlutterForegroundTask.checkNotificationPermission();
      if (permission != NotificationPermission.granted) {
        await FlutterForegroundTask.requestNotificationPermission();
      }
    } catch (_) {
      // If this fails the service can still start; only the notification is
      // suppressed by the OS.
    }
  }

  /// Optional escape hatch for aggressive OEM battery optimizers (Xiaomi,
  /// Huawei, …) that can still kill the foreground service. Surfaced as a
  /// button in settings, never prompted automatically.
  Future<bool> requestIgnoreBatteryOptimization() async {
    if (!_supported) return true;
    try {
      if (await FlutterForegroundTask.isIgnoringBatteryOptimizations) return true;
      return await FlutterForegroundTask.requestIgnoreBatteryOptimization();
    } catch (_) {
      return false;
    }
  }
}
