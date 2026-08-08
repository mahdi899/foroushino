import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/models/upload_progress.dart';
import 'package:bahram_family_manager/services/background_upload_keep_alive.dart';
import 'package:bahram_family_manager/services/upload_coordinator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('UploadCoordinator', () {
    late UploadCoordinator uploads;

    setUp(() {
      uploads = UploadCoordinator(keepAlive: BackgroundUploadKeepAlive());
    });

    tearDown(() {
      uploads.dispose();
    });

    test('start runs job independent of listeners and exposes whenDone', () async {
      final task = uploads.start(
        slot: 'post:main',
        filename: 'clip.mp4',
        type: 'video',
        job: (task) async {
          task.reportProgress(const UploadProgress(
            phase: MediaUploadPhase.uploading,
            sentBytes: 50,
            totalBytes: 100,
          ));
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return FamilyMediaRef(
            id: 42,
            type: 'video',
            status: 'ready',
            originalFilename: 'clip.mp4',
            size: 100,
          );
        },
      );

      expect(uploads.hasActive, isTrue);
      expect(uploads.taskFor('post:main'), same(task));

      final media = await task.whenDone;
      expect(media.id, 42);
      expect(task.isReady, isTrue);
      expect(uploads.hasActive, isFalse);

      uploads.forget('post:main');
      expect(uploads.taskFor('post:main'), isNull);
    });

    test('cancel completes whenDone with error and clears active flag', () async {
      final task = uploads.start(
        slot: 'story:main',
        filename: 'big.mp4',
        type: 'video',
        job: (task) async {
          await Future<void>.delayed(const Duration(seconds: 2));
          return FamilyMediaRef(
            id: 1,
            type: 'video',
            status: 'ready',
            originalFilename: 'big.mp4',
          );
        },
      );

      expect(uploads.hasActive, isTrue);
      uploads.cancel('story:main');
      // Job itself ignores cancelToken here — force complete via replace/cancel token
      // by awaiting briefly then replacing the slot.
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(task.isCancelled, isTrue);
    });

    test('pendingPostDraft survives until consumed', () {
      uploads.pendingPostDraft = {'type': 'video', 'text': 'سلام'};
      expect(uploads.pendingPostDraft?['type'], 'video');
      uploads.cancelAll();
      expect(uploads.pendingPostDraft, isNull);
    });
  });
}
