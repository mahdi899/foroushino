import 'dart:typed_data';

import 'package:dio/dio.dart';

import 'package:bahram_family_manager/core/api/api_client.dart';
import 'package:bahram_family_manager/models/models.dart';

/// All calls under `/api/v1/family-manager/*` — the Bahram + authorized-admin
/// surface. Every route is additionally guarded server-side by the
/// `family.manage:<permission>` middleware; a 403 surfaces as [ApiException].
class FamilyManagerService {
  FamilyManagerService({ApiClient? api}) : api = api ?? ApiClient();

  final ApiClient api;

  static const _base = '/family-manager';

  /// Chunked upload kicks in above this size so large voice/video files
  /// don't time out or blow past PHP's post_max_size in one request.
  static const _chunkThresholdBytes = 20 * 1024 * 1024;
  static const _chunkSizeBytes = 5 * 1024 * 1024;

  Future<HomeStats> home() async {
    final res = await api.get('$_base/home');
    return HomeStats.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Posts
  // ---------------------------------------------------------------------

  Future<PaginatedResult<FamilyPostModel>> listPosts({String? status, int page = 1}) async {
    final res = await api.get('$_base/posts', query: {
      if (status != null) 'status': status,
      'page': page,
    });
    return PaginatedResult.fromEnvelope(res, FamilyPostModel.fromJson);
  }

  Future<FamilyPostModel> showPost(int id) async {
    final res = await api.get('$_base/posts/$id');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyPostModel> createPost(Map<String, dynamic> payload) async {
    final res = await api.post('$_base/posts', data: payload);
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyPostModel> updatePost(int id, Map<String, dynamic> payload) async {
    final res = await api.patch('$_base/posts/$id', data: payload);
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyPostModel> publishPost(int id) async {
    final res = await api.post('$_base/posts/$id/publish');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> archivePost(int id) => api.post('$_base/posts/$id/archive');

  Future<void> deletePost(int id) => api.delete('$_base/posts/$id');

  Future<FamilyPostModel> pinPost(int id) async {
    final res = await api.post('$_base/posts/$id/pin');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyPostModel> unpinPost(int id) async {
    final res = await api.post('$_base/posts/$id/unpin');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Branding & stories
  // ---------------------------------------------------------------------

  Future<FamilyBrandingSettings> getSettings() async {
    final res = await api.get('$_base/settings');
    return FamilyBrandingSettings.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyBrandingSettings> updateSettings(Map<String, dynamic> payload) async {
    final res = await api.patch('$_base/settings', data: payload);
    return FamilyBrandingSettings.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<List<FamilyStoryModel>> listStories() async {
    final res = await api.get('$_base/stories');
    final data = res['data'] as List? ?? [];
    return data.map((e) => FamilyStoryModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<FamilyStoryModel> publishStory({required int mediaId, String? caption}) async {
    final res = await api.post('$_base/stories', data: {
      'media_id': mediaId,
      if (caption != null && caption.isNotEmpty) 'caption': caption,
    });
    return FamilyStoryModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> deleteStory(int id) => api.delete('$_base/stories/$id');

  Future<FamilyPostModel> replyToComment({
    required int commentId,
    required String type,
    String? text,
    int? mediaId,
  }) async {
    final res = await api.post('$_base/posts/$commentId/reply', data: {
      'type': type,
      if (text != null) 'text': text,
      if (mediaId != null) 'media_id': mediaId,
    });
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Comment moderation
  // ---------------------------------------------------------------------

  Future<PaginatedResult<FamilyCommentModel>> listComments({String tab = 'pending', int page = 1}) async {
    final res = await api.get('$_base/comments', query: {'tab': tab, 'page': page});
    return PaginatedResult.fromEnvelope(res, FamilyCommentModel.fromJson);
  }

  Future<FamilyCommentModel> approveComment(int id) async {
    final res = await api.post('$_base/comments/$id/approve');
    return FamilyCommentModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyCommentModel> rejectComment(int id, {required String reason, String? note}) async {
    final res = await api.post('$_base/comments/$id/reject', data: {
      'reason': reason,
      if (note != null && note.isNotEmpty) 'note': note,
    });
    return FamilyCommentModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<int> batchApprove(List<int> ids) async {
    final res = await api.post('$_base/comments/batch-approve', data: {'comment_ids': ids});
    final data = (res['data'] as Map).cast<String, dynamic>();
    return (data['approved'] as num?)?.toInt() ?? 0;
  }

  Future<FamilyCommentModel> toggleImportant(int id) async {
    final res = await api.post('$_base/comments/$id/mark-important');
    return FamilyCommentModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyCommentModel> togglePulse(int id) async {
    final res = await api.post('$_base/comments/$id/pulse');
    return FamilyCommentModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> markSeen(int id) => api.post('$_base/comments/$id/seen');

  // ---------------------------------------------------------------------
  // Families
  // ---------------------------------------------------------------------

  Future<PaginatedResult<FamilySummaryModel>> listFamilies({String? search, String? lifecycle, int page = 1}) async {
    final res = await api.get('$_base/families', query: {
      if (search != null && search.isNotEmpty) 'search': search,
      if (lifecycle != null) 'lifecycle': lifecycle,
      'page': page,
    });
    return PaginatedResult.fromEnvelope(res, FamilySummaryModel.fromJson);
  }

  Future<FamilyDetailModel> showFamily(int id) async {
    final res = await api.get('$_base/families/$id');
    return FamilyDetailModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyDetailModel> createFamily(Map<String, dynamic> payload) async {
    final res = await api.post('$_base/families', data: payload);
    return FamilyDetailModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyDetailModel> updateFamily(int id, Map<String, dynamic> payload) async {
    final res = await api.patch('$_base/families/$id', data: payload);
    return FamilyDetailModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> deleteFamily(int id) => api.delete('$_base/families/$id');

  Future<List<FamilyEntryEventModel>> listEntryEvents({String? search}) async {
    final res = await api.get('$_base/entry-events', query: {
      if (search != null && search.isNotEmpty) 'search': search,
    });
    final data = res['data'] as List? ?? [];
    return data.map((e) => FamilyEntryEventModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<List<AudienceSuggestion>> audienceSuggestions() async {
    final res = await api.get('$_base/audience-suggestions');
    final data = res['data'] as List? ?? [];
    return data.map((e) => AudienceSuggestion.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  // ---------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------

  Future<AnalyticsData> analytics({int days = 30}) async {
    final res = await api.get('$_base/analytics', query: {'days': days});
    return AnalyticsData.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Media — simple upload for small files, chunked session for large ones.
  // Playback/CDN URL is only ever read from `cdn_url` in the response below;
  // never construct storage paths on the client.
  // ---------------------------------------------------------------------

  Future<FamilyMediaRef> uploadMedia({
    required Uint8List bytes,
    required String filename,
    required String type,
    void Function(double progress)? onProgress,
  }) async {
    final size = bytes.length;
    if (size <= _chunkThresholdBytes) {
      return _uploadSimple(bytes, filename, type, onProgress: onProgress);
    }
    return _uploadChunked(bytes, filename, type, onProgress: onProgress);
  }

  Future<FamilyMediaRef> _uploadSimple(
    Uint8List bytes,
    String filename,
    String type, {
    void Function(double progress)? onProgress,
  }) async {
    final form = FormData.fromMap({
      'type': type,
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });

    final res = await api.postForm(
      '$_base/media',
      form,
      onSendProgress: (sent, total) {
        if (total > 0) onProgress?.call(sent / total);
      },
    );
    return FamilyMediaRef.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyMediaRef> _uploadChunked(
    Uint8List bytes,
    String filename,
    String type, {
    void Function(double progress)? onProgress,
  }) async {
    final totalSize = bytes.length;

    final sessionRes = await api.post('$_base/media/sessions', data: {
      'type': type,
      'filename': filename,
      'total_size': totalSize,
      'chunk_size': _chunkSizeBytes,
    });
    final session = (sessionRes['data'] as Map).cast<String, dynamic>();
    final ulid = session['ulid'] as String;
    final totalChunks = (session['total_chunks'] as num).toInt();

    for (var index = 0; index < totalChunks; index++) {
      final start = index * _chunkSizeBytes;
      final end = start + _chunkSizeBytes;
      final chunk = bytes.sublist(start, end > totalSize ? totalSize : end);

      final form = FormData.fromMap({
        'index': index,
        'chunk': MultipartFile.fromBytes(chunk, filename: 'chunk_$index'),
      });
      await api.postForm('$_base/media/sessions/$ulid/chunk', form);
      onProgress?.call((index + 1) / totalChunks);
    }

    final completeRes = await api.post('$_base/media/sessions/$ulid/complete');
    return FamilyMediaRef.fromJson((completeRes['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyMediaRef> showMedia(int id) async {
    final res = await api.get('$_base/media/$id');
    return FamilyMediaRef.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyMediaRef> retryMedia(int id) async {
    final res = await api.post('$_base/media/$id/retry');
    return FamilyMediaRef.fromJson((res['data'] as Map).cast<String, dynamic>());
  }
}
