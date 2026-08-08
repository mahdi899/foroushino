import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('resolveMediaUrl', () {
    test('rewrites localhost:3000 storage URLs away from the Next.js port', () {
      final resolved = resolveMediaUrl('http://localhost:3000/storage/media/family/clip.mp4');
      expect(resolved, isNotNull);
      expect(resolved!, isNot(contains(':3000')));
      expect(resolved, contains('/storage/media/family/clip.mp4'));
      // Native/desktop default API origin (not the browser Next proxy).
      expect(
        resolved.startsWith('http://127.0.0.1:8010/') ||
            resolved.startsWith('http://10.0.2.2:8010/'),
        isTrue,
        reason: 'got $resolved',
      );
    });

    test('rewrites 127.0.0.1 frontend storage URLs to API origin', () {
      final resolved = resolveMediaUrl('http://127.0.0.1:3000/storage/foo.mp4');
      expect(resolved, isNotNull);
      expect(resolved!, isNot(contains(':3000')));
      expect(resolved, endsWith('/storage/foo.mp4'));
    });

    test('leaves real CDN hosts unchanged', () {
      const raw = 'https://cdn.rostami.app/media/family/clip.mp4';
      expect(resolveMediaUrl(raw), raw);
    });

    test('joins relative storage paths to API origin', () {
      final resolved = resolveMediaUrl('/storage/media/x.mp4');
      expect(resolved, isNotNull);
      expect(resolved!, endsWith('/storage/media/x.mp4'));
      expect(
        resolved.startsWith('http://127.0.0.1:8010/') ||
            resolved.startsWith('http://10.0.2.2:8010/'),
        isTrue,
      );
    });
  });

  group('MediaUploadPhase.overallPercent', () {
    test('maps transport bands across the pipeline', () {
      expect(MediaUploadPhase.uploading.overallPercent(0), 0);
      expect(MediaUploadPhase.uploading.overallPercent(1), 70);
      expect(MediaUploadPhase.finalizing.overallPercent(1), 85);
      expect(MediaUploadPhase.processing.overallPercent(1), 88);
      expect(MediaUploadPhase.ready.overallPercent(1), 100);
    });
  });
}
