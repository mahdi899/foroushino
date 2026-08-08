import 'package:bahram_family_manager/core/utils/media_failure_messages.dart';
import 'package:bahram_family_manager/models/upload_progress.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('host-prep status labels', () {
    test('processing uses host status and attempt', () {
      const upload = UploadProgress(
        phase: MediaUploadPhase.processing,
        sentBytes: 100,
        totalBytes: 100,
        hostStatus: 'transferring',
        pollAttempt: 3,
      );
      expect(upload.statusLabel, contains('هاست دانلود'));
      expect(upload.statusLabel, contains('۳'));
    });

    test('statusDetail overrides default processing label', () {
      final upload = UploadProgress(
        phase: MediaUploadPhase.processing,
        sentBytes: 0,
        totalBytes: 0,
        statusDetail: MediaFailureMessages.hostPrepReconnect(2),
      );
      expect(upload.statusLabel, contains('تلاش مجدد'));
      expect(upload.statusLabel, contains('۲'));
    });

    test('timeout message mentions local host caveat', () {
      final msg = MediaFailureMessages.timeoutWaitingReady();
      expect(msg, contains('لوکال'));
      expect(msg, contains('production'));
    });
  });
}
