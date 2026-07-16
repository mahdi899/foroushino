// Pure model/formatter unit tests — no widget pumping needed, so these don't
// depend on a device/emulator. Run with `flutter test` once the Flutter SDK
// is available (see README.md — this environment didn't have one).
import 'package:flutter_test/flutter_test.dart';

import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';

void main() {
  group('formatters', () {
    test('toFaDigits converts ASCII digits to Persian digits', () {
      expect(toFaDigits('123'), '۱۲۳');
      expect(toFaDigits('نظر 5'), 'نظر ۵');
    });

    test('formatBytes renders a human size', () {
      expect(formatBytes(null), '—');
      expect(formatBytes(500), '500 B');
      expect(formatBytes(2048), toFaDigits('2.0') + ' KB');
    });
  });

  group('FamilyPostModel.fromJson', () {
    test('parses a text post with nested blocks/actions/targets', () {
      final json = {
        'id': 10,
        'type': 'text',
        'status': 'draft',
        'audience_mode': 'include',
        'is_important': true,
        'published_at': null,
        'created_at': '2026-07-14T10:00:00Z',
        'author': {'id': 1, 'name': 'بهرام'},
        'blocks': [
          {'id': 1, 'type': 'text', 'position': 0, 'text_content': 'سلام خانواده'},
        ],
        'actions': [
          {
            'id': 5,
            'type': 'commitment',
            'prompt': 'متعهد می‌شوی؟',
            'options': [],
          },
        ],
        'targets' => [
          {'id': 1, 'post_id': 10, 'family_id': 3, 'family_name': 'نور'},
        ],
        'audience_summary': 'نور',
      };

      final post = FamilyPostModel.fromJson(json);

      expect(post.id, 10);
      expect(post.isDraft, isTrue);
      expect(post.isImportant, isTrue);
      expect(post.authorName, 'بهرام');
      expect(post.preview, 'سلام خانواده');
      expect(post.actions.single.type, 'commitment');
      expect(post.targetFamilyIds, [3]);
      expect(post.channelLabel, 'نور');
      expect(post.targetFamilies.single.familyName, 'نور');
    });

    test('preview falls back to a media label when there is no text block', () {
      final json = {
        'id': 11,
        'type': 'voice',
        'status': 'published',
        'audience_mode': 'all',
        'is_important': false,
        'blocks': [
          {'id': 2, 'type': 'audio', 'position': 0, 'media_id': 7},
        ],
      };

      final post = FamilyPostModel.fromJson(json);
      expect(post.preview, contains('صوتی'));
      expect(post.isPublished, isTrue);
    });
  });

  group('FamilyCommentModel.fromJson', () {
    test('parses AI signals and rejection metadata', () {
      final json = {
        'id': 1,
        'body': 'متن نظر',
        'status': 'rejected',
        'is_important': false,
        'in_pulse': false,
        'seen_by_bahram': true,
        'user': {'name': 'علی'},
        'family': {'internal_name': 'F-001'},
        'post_id': 10,
        'ai': {
          'risk_score': 0.85,
          'sentiment': 'negative',
          'topic': 'تبلیغات',
          'signals': ['advertising', 'spam'],
        },
        'rejection_reason': 'advertisement',
        'rejection_note': null,
      };

      final comment = FamilyCommentModel.fromJson(json);

      expect(comment.riskScore, 0.85);
      expect(comment.signals, ['advertising', 'spam']);
      expect(comment.rejectionReason, 'advertisement');
      expect(comment.seenByBahram, isTrue);
    });
  });

  group('PaginatedResult.fromEnvelope', () {
    test('maps items and reads pagination meta', () {
      final envelope = {
        'data': [
          {'id': 1, 'internal_name': 'F-1', 'lifecycle': 'active', 'member_count': 10, 'capacity_target': 5000, 'capacity_max': 5200},
        ],
        'meta': {'current_page': 2, 'last_page': 5, 'total': 100},
      };

      final result = PaginatedResult<FamilySummaryModel>.fromEnvelope(envelope, FamilySummaryModel.fromJson);

      expect(result.items.single.internalName, 'F-1');
      expect(result.currentPage, 2);
      expect(result.hasMore, isTrue);
    });
  });
}
