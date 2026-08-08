import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:bahram_family_manager/core/utils/file_download.dart';
import 'package:bahram_family_manager/core/utils/read_file_chunk.dart';

import 'package:bahram_family_manager/core/api/api_client.dart';
import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/utils/media_failure_messages.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/models/upload_progress.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';

/// All calls under `/api/v1/family-manager/*` — the Bahram + authorized-admin
/// surface. Every route is additionally guarded server-side by the
/// `family.manage:<permission>` middleware; a 403 surfaces as [ApiException].
class FamilyManagerService {
  FamilyManagerService({ApiClient? api}) : api = api ?? ApiClient();

  final ApiClient api;

  static const _base = '/family-manager';

  /// Chunked upload kicks in above this size so large voice/video files
  /// don't time out or blow past PHP's post_max_size in one request.
  static const chunkThresholdBytes = 20 * 1024 * 1024;
  static const chunkSizeBytes = 5 * 1024 * 1024;

  static const _chunkThresholdBytes = chunkThresholdBytes;
  static const _chunkSizeBytes = chunkSizeBytes;

  Future<HomeStats> home() async {
    final res = await api.get('$_base/home');
    return HomeStats.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Posts
  // ---------------------------------------------------------------------

  Future<PaginatedResult<FamilyPostModel>> listPosts({String? status, int? familyId, int page = 1}) async {
    final res = await api.get('$_base/posts', query: {
      if (status != null) 'status': status,
      if (familyId != null) 'family_id': familyId,
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

  Future<FamilyPostModel> recoverPost(int id) async {
    final res = await api.post('$_base/posts/$id/recover');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> deletePost(int id) => api.delete('$_base/posts/$id');

  Future<FamilyPostModel> pinPost(int id) async {
    final res = await api.post('$_base/posts/$id/pin');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyPostModel> unpinPost(int id) async {
    final res = await api.post('$_base/posts/$id/unpin');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<List<FamilyActionResultModel>> getPostActionResults(int postId) async {
    final res = await api.get('$_base/posts/$postId/action-results');
    final data = res['data'] as List? ?? [];
    return data.map((e) => FamilyActionResultModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  String actionResultsExportUrl(int postId) => '${api.dio.options.baseUrl}$_base/posts/$postId/action-results/export';

  Future<void> downloadActionResultsExport(int postId) async {
    final response = await api.dio.get<List<int>>(
      '$_base/posts/$postId/action-results/export',
      options: Options(responseType: ResponseType.bytes),
    );
    final bytes = response.data ?? <int>[];
    await downloadFile('family-post-$postId-action-results.csv', bytes);
  }

  Future<Map<String, dynamic>> generatePostDraft({
    required String topic,
    String type = 'text',
    String? tone,
  }) async {
    final res = await api.post('$_base/posts/ai-draft', data: {
      'topic': topic,
      'type': type,
      if (tone != null && tone.isNotEmpty) 'tone': tone,
    });
    return (res['data'] as Map).cast<String, dynamic>();
  }

  Future<FamilyAiSettings> updateAiSettings(Map<String, dynamic> payload) async {
    final res = await api.patch('$_base/settings/ai', data: payload);
    return FamilyAiSettings.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<({bool success, String message, String? provider, String? model})> testAiConnection({
    Map<String, dynamic>? draft,
  }) async {
    final res = await api.post('$_base/settings/ai/test', data: draft);
    final data = (res['data'] as Map).cast<String, dynamic>();
    return (
      success: data['success'] == true,
      message: data['message']?.toString() ?? '',
      provider: data['provider']?.toString(),
      model: data['model']?.toString(),
    );
  }

  Future<List<AiProviderMeta>> listAiProviders() async {
    final res = await api.get('$_base/settings/ai/providers');
    final data = (res['data'] as Map).cast<String, dynamic>();
    final providers = (data['providers'] as List?) ?? const [];
    return providers
        .map((e) => AiProviderMeta.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
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

  Future<FamilyMediaPipelineSettings> updateMediaPipeline(Map<String, dynamic> payload) async {
    final res = await api.patch('$_base/settings/media-pipeline', data: payload);
    return FamilyMediaPipelineSettings.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<List<FamilyStoryModel>> listStories() async {
    final res = await api.get('$_base/stories');
    final data = res['data'] as List? ?? [];
    return data.map((e) => FamilyStoryModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<FamilyStoryModel> publishStory({
    required int mediaId,
    String? caption,
    String audienceMode = 'all',
    List<int> familyIds = const [],
  }) async {
    final res = await api.post('$_base/stories', data: {
      'media_id': mediaId,
      if (caption != null && caption.isNotEmpty) 'caption': caption,
      'audience_mode': audienceMode,
      'family_ids': audienceMode == 'all' ? <int>[] : familyIds,
    });
    return FamilyStoryModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> deleteStory(int id) => api.delete('$_base/stories/$id');

  Future<List<FamilyStoryViewerModel>> listStoryViewers(int storyId) async {
    final res = await api.get('$_base/stories/$storyId/viewers');
    final data = res['data'] as List? ?? [];
    return data.map((e) => FamilyStoryViewerModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<FamilyPostModel> schedulePost(int id, DateTime publishAt) async {
    final res = await api.post('$_base/posts/$id/schedule', data: {
      'publish_at': publishAt.toUtc().toIso8601String(),
    });
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyPostModel> unschedulePost(int id) async {
    final res = await api.post('$_base/posts/$id/unschedule');
    return FamilyPostModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyCommentModel> replyToComment({
    required int commentId,
    required String text,
  }) async {
    final res = await api.post('$_base/posts/$commentId/reply', data: {
      'type': 'text',
      'text': text,
    });
    return FamilyCommentModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Comment moderation
  // ---------------------------------------------------------------------

  Future<PaginatedResult<CommentThreadModel>> listCommentThreads({
    String tab = 'pending',
    int? familyId,
    String? search,
    int page = 1,
  }) async {
    final trimmedSearch = search?.trim();
    try {
      final res = await api.get('$_base/comments/threads', query: {
        'tab': tab,
        'page': page,
        if (familyId != null) 'family_id': familyId,
        if (trimmedSearch != null && trimmedSearch.isNotEmpty) 'search': trimmedSearch,
      });
      return PaginatedResult.fromEnvelope(res, CommentThreadModel.fromJson);
    } on ApiException catch (e) {
      if (!_shouldFallbackCommentThreads(e)) rethrow;
      return _commentThreadsFromComments(
        tab: tab,
        familyId: familyId,
        search: trimmedSearch,
        page: page,
      );
    }
  }

  /// Older production backends only expose `GET /comments`; aggregate threads
  /// client-side so the hub still loads before deploy catches up.
  bool _shouldFallbackCommentThreads(ApiException e) {
    final status = e.statusCode;
    // Only treat "endpoint missing" as legacy — never hide real 5xx SQL errors.
    return status == 404 || status == 405 || status == 501;
  }

  Future<PaginatedResult<CommentThreadModel>> _commentThreadsFromComments({
    required String tab,
    int? familyId,
    String? search,
    required int page,
  }) async {
    final commentsResult = await listComments(
      tab: tab,
      familyId: familyId,
      search: search,
      page: page,
    );
    final accumulators = <String, _CommentThreadAccumulator>{};

    for (final comment in commentsResult.items) {
      final familyIdValue = comment.familyId ?? 0;
      final key = '${comment.postId}:$familyIdValue';
      accumulators.putIfAbsent(
        key,
        () => _CommentThreadAccumulator(
          postId: comment.postId,
          familyId: familyIdValue,
          familyInternalName: comment.familyInternalName,
          postType: comment.postType,
          postPreview: comment.postPreview,
          publishedAt: comment.publishedAt,
        ),
      ).add(comment, tab);
    }

    final items = accumulators.values.map((a) => a.toModel()).toList()
      ..sort((a, b) {
        final byPublished = (b.publishedAt ?? '').compareTo(a.publishedAt ?? '');
        if (byPublished != 0) return byPublished;
        return b.postId.compareTo(a.postId);
      });

    return PaginatedResult(
      items: items,
      currentPage: commentsResult.currentPage,
      lastPage: commentsResult.lastPage,
      total: commentsResult.total,
    );
  }

  Future<PaginatedResult<FamilyCommentModel>> listComments({
    String tab = 'pending',
    int? postId,
    int? familyId,
    String? search,
    int page = 1,
  }) async {
    final trimmedSearch = search?.trim();
    final res = await api.get('$_base/comments', query: {
      'tab': tab,
      'page': page,
      if (postId != null) 'post_id': postId,
      if (familyId != null) 'family_id': familyId,
      if (trimmedSearch != null && trimmedSearch.isNotEmpty) 'search': trimmedSearch,
    });
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

  Future<PaginatedResult<FamilySummaryModel>> listFamilies({
    String? search,
    String? lifecycle,
    int page = 1,
    int perPage = 25,
  }) async {
    final res = await api.get('$_base/families', query: {
      if (search != null && search.isNotEmpty) 'search': search,
      if (lifecycle != null) 'lifecycle': lifecycle,
      'page': page,
      'per_page': perPage,
    });
    return PaginatedResult.fromEnvelope(res, FamilySummaryModel.fromJson);
  }

  Future<FamilyDetailModel> showFamily(int id) async {
    final res = await api.get('$_base/families/$id');
    return FamilyDetailModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<PaginatedResult<FamilyMemberModel>> listMembers({
    int? familyId,
    int? entryEventId,
    int? entryLinkId,
    String? entrySource,
    String? search,
    int page = 1,
    int perPage = 25,
  }) async {
    final path = entryLinkId != null
        ? '$_base/entry-links/$entryLinkId/members'
        : (familyId == null ? '$_base/members' : '$_base/families/$familyId/members');
    final res = await api.get(
      path,
      query: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (entryEventId != null) 'entry_event_id': entryEventId,
        if (entryLinkId == null && entrySource != null && entrySource.isNotEmpty) 'entry_source': entrySource,
        'page': page,
        'per_page': perPage,
      },
    );
    return PaginatedResult.fromEnvelope(res, FamilyMemberModel.fromJson);
  }

  Future<FamilyMemberModel> addMember({
    required int familyId,
    required String mobile,
    String? name,
  }) async {
    final res = await api.post('$_base/families/$familyId/members', data: {
      'mobile': mobile,
      if (name != null && name.isNotEmpty) 'name': name,
    });
    return FamilyMemberModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> removeMember({required int familyId, required int membershipId}) =>
      api.delete('$_base/families/$familyId/members/$membershipId');

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

  Future<List<EntryLinkModel>> listEntryLinks({int days = 30, int? familyId}) async {
    final res = await api.get('$_base/entry-links', query: {
      'days': days,
      if (familyId != null) 'family_id': familyId,
    });
    final data = res['data'] as List? ?? [];
    return data.map((e) => EntryLinkModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<EntryLinkModel> createEntryLink(Map<String, dynamic> payload) async {
    final res = await api.post('$_base/entry-links', data: payload);
    return EntryLinkModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<EntryLinkModel> updateEntryLink(int id, Map<String, dynamic> payload) async {
    final res = await api.patch('$_base/entry-links/$id', data: payload);
    return EntryLinkModel.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> deactivateEntryLink(int id) => api.delete('$_base/entry-links/$id');

  Future<List<AudienceSuggestion>> audienceSuggestions() async {
    final res = await api.get('$_base/audience-suggestions');
    final data = res['data'] as List? ?? [];
    return data.map((e) => AudienceSuggestion.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  // ---------------------------------------------------------------------
  // Landing page leads
  // ---------------------------------------------------------------------

  Future<List<LandingPageOptionModel>> listLandingPagesForLeads() async {
    final res = await api.get('$_base/landing-leads/landing-pages');
    final data = res['data'] as List? ?? [];
    return data.map((e) => LandingPageOptionModel.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<PaginatedResult<LandingLeadModel>> listLandingLeads({
    bool unassignedOnly = false,
    int? landingPageId,
    String? search,
    int page = 1,
    int perPage = 25,
  }) async {
    final res = await api.get('$_base/landing-leads', query: {
      if (unassignedOnly) 'unassigned': 1,
      if (landingPageId != null) 'landing_page_id': landingPageId,
      if (search != null && search.isNotEmpty) 'search': search,
      'page': page,
      'per_page': perPage,
    });
    return PaginatedResult.fromEnvelope(res, LandingLeadModel.fromJson);
  }

  Future<LandingLeadModel> assignLandingLead({
    required int leadId,
    required int familyId,
  }) async {
    final res = await api.post('$_base/landing-leads/$leadId/assign', data: {
      'family_id': familyId,
    });
    final data = (res['data'] as Map).cast<String, dynamic>();
    return LandingLeadModel.fromJson((data['lead'] as Map).cast<String, dynamic>());
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

  /// Uploads media from in-memory [bytes] and/or a local disk [path].
  /// Prefer [path] for large videos so chunks are streamed without loading the
  /// whole file into RAM. At least one of [bytes] / [path] is required.
  Future<FamilyMediaRef> uploadMedia({
    Uint8List? bytes,
    String? path,
    required String filename,
    required String type,
    bool? optimizeImages,
    void Function(double progress)? onProgress,
    MediaUploadStateCallback? onUploadState,
    CancelToken? cancelToken,
  }) async {
    final hasBytes = bytes != null && bytes.isNotEmpty;
    final hasPath = path != null && path.isNotEmpty;
    if (!hasBytes && !hasPath) {
      throw ApiException(message: 'فایلی برای آپلود مشخص نشده است.', code: 'no_media_source');
    }

    final sourceBytes = hasBytes ? bytes : null;
    final sourcePath = hasPath ? path : null;

    final size = sourceBytes != null
        ? sourceBytes.length
        : await fileByteLength(sourcePath as String);

    if (size <= _chunkThresholdBytes) {
      final payload = sourceBytes ?? await readFileChunk(sourcePath as String, 0, size);
      return _uploadSimple(
        payload,
        filename,
        type,
        optimizeImages: optimizeImages,
        onProgress: onProgress,
        onUploadState: onUploadState,
        cancelToken: cancelToken,
      );
    }

    if (sourcePath != null && !kIsWeb) {
      return _uploadChunkedFromPath(
        sourcePath,
        filename,
        type,
        totalSize: size,
        optimizeImages: optimizeImages,
        onProgress: onProgress,
        onUploadState: onUploadState,
        cancelToken: cancelToken,
      );
    }

    if (sourceBytes == null) {
      throw ApiException(
        message: 'خواندن فایل برای آپلود ناموفق بود.',
        code: 'media_bytes_missing',
      );
    }

    return _uploadChunked(
      sourceBytes,
      filename,
      type,
      optimizeImages: optimizeImages,
      onProgress: onProgress,
      onUploadState: onUploadState,
      cancelToken: cancelToken,
    );
  }

  static const _chunkRetryAttempts = 3;
  static const _chunkRetryDelay = Duration(seconds: 2);

  void _reportUploadState(
    MediaUploadStateCallback? onUploadState,
    void Function(double progress)? onProgress,
    MediaUploadPhase phase,
    int sentBytes,
    int totalBytes,
  ) {
    final upload = UploadProgress(
      phase: phase,
      sentBytes: sentBytes,
      totalBytes: totalBytes,
    );
    onUploadState?.call(upload);
    if (phase == MediaUploadPhase.uploading || phase == MediaUploadPhase.finalizing) {
      onProgress?.call(upload.fraction);
    }
  }

  void _reportMediaPipelineState(
    FamilyMediaRef media,
    MediaUploadStateCallback? onUploadState,
    int totalBytes,
  ) {
    if (media.isReady) {
      onUploadState?.call(UploadProgress(
        phase: MediaUploadPhase.ready,
        sentBytes: totalBytes,
        totalBytes: totalBytes,
      ));
    } else if (media.status == 'failed') {
      onUploadState?.call(UploadProgress(
        phase: MediaUploadPhase.failed,
        sentBytes: 0,
        totalBytes: totalBytes,
      ));
    } else {
      onUploadState?.call(UploadProgress(
        phase: MediaUploadPhase.processing,
        sentBytes: totalBytes,
        totalBytes: totalBytes,
      ));
    }
  }

  Future<void> _postChunkWithRetry(
    String path,
    FormData form, {
    required int baseBytes,
    required int totalBytes,
    MediaUploadStateCallback? onUploadState,
    void Function(double progress)? onProgress,
    CancelToken? cancelToken,
  }) async {
    Object? lastError;
    for (var attempt = 0; attempt < _chunkRetryAttempts; attempt++) {
      if (cancelToken?.isCancelled ?? false) {
        throw ApiException.fromDio(cancelToken!.cancelError!);
      }
      try {
        await api.postForm(
          path,
          form,
          cancelToken: cancelToken,
          onSendProgress: (sent, total) {
            if (total <= 0) return;
            final overallSent = baseBytes + sent;
            _reportUploadState(
              onUploadState,
              onProgress,
              MediaUploadPhase.uploading,
              overallSent,
              totalBytes,
            );
          },
        );
        return;
      } catch (e) {
        lastError = e;
        if (e is DioException && CancelToken.isCancel(e)) rethrow;
        if (e is ApiException && e.code == 'cancelled') rethrow;
        if (attempt < _chunkRetryAttempts - 1) {
          await Future<void>.delayed(_chunkRetryDelay);
        }
      }
    }
    throw lastError ??
        ApiException(
          message:
              'آپلود تکه‌ای پس از چند تلاش ناموفق بود. اینترنت یا VPN را بررسی کنید؛ اگر حجم فایل بالاست اتصال پایدارتری لازم است.',
          code: 'chunk_upload_failed',
        );
  }

  Future<FamilyMediaRef> _uploadSimple(
    Uint8List bytes,
    String filename,
    String type, {
    bool? optimizeImages,
    void Function(double progress)? onProgress,
    MediaUploadStateCallback? onUploadState,
    CancelToken? cancelToken,
  }) async {
    final totalBytes = bytes.length;
    _reportUploadState(onUploadState, onProgress, MediaUploadPhase.uploading, 0, totalBytes);

    final form = FormData.fromMap({
      'type': type,
      'file': MultipartFile.fromBytes(bytes, filename: filename),
      if (optimizeImages != null) 'optimize_images': optimizeImages ? 1 : 0,
    });

    final res = await api.postForm(
      '$_base/media',
      form,
      cancelToken: cancelToken,
      onSendProgress: (sent, total) {
        if (total > 0) {
          _reportUploadState(
            onUploadState,
            onProgress,
            MediaUploadPhase.uploading,
            sent,
            total,
          );
        }
      },
    );
    final media = FamilyMediaRef.fromJson((res['data'] as Map).cast<String, dynamic>());
    _reportMediaPipelineState(media, onUploadState, totalBytes);
    return media;
  }

  Future<FamilyMediaRef> _uploadChunked(
    Uint8List bytes,
    String filename,
    String type, {
    bool? optimizeImages,
    void Function(double progress)? onProgress,
    MediaUploadStateCallback? onUploadState,
    CancelToken? cancelToken,
  }) async {
    return _uploadChunkedSession(
      filename: filename,
      type: type,
      totalSize: bytes.length,
      optimizeImages: optimizeImages,
      onProgress: onProgress,
      onUploadState: onUploadState,
      cancelToken: cancelToken,
      readChunk: (start, length) async {
        final end = start + length;
        return bytes.sublist(start, end > bytes.length ? bytes.length : end);
      },
    );
  }

  Future<FamilyMediaRef> _uploadChunkedFromPath(
    String path,
    String filename,
    String type, {
    required int totalSize,
    bool? optimizeImages,
    void Function(double progress)? onProgress,
    MediaUploadStateCallback? onUploadState,
    CancelToken? cancelToken,
  }) async {
    return _uploadChunkedSession(
      filename: filename,
      type: type,
      totalSize: totalSize,
      optimizeImages: optimizeImages,
      onProgress: onProgress,
      onUploadState: onUploadState,
      cancelToken: cancelToken,
      readChunk: (start, length) => readFileChunk(path, start, length),
    );
  }

  Future<FamilyMediaRef> _uploadChunkedSession({
    required String filename,
    required String type,
    required int totalSize,
    required Future<Uint8List> Function(int start, int length) readChunk,
    bool? optimizeImages,
    void Function(double progress)? onProgress,
    MediaUploadStateCallback? onUploadState,
    CancelToken? cancelToken,
  }) async {
    _reportUploadState(onUploadState, onProgress, MediaUploadPhase.uploading, 0, totalSize);

    final sessionRes = await api.post(
      '$_base/media/sessions',
      cancelToken: cancelToken,
      data: {
        'type': type,
        'filename': filename,
        'total_size': totalSize,
        'chunk_size': _chunkSizeBytes,
        if (optimizeImages != null) 'optimize_images': optimizeImages ? 1 : 0,
      },
    );
    final session = (sessionRes['data'] as Map).cast<String, dynamic>();
    final ulid = session['ulid'] as String;
    final totalChunks = (session['total_chunks'] as num).toInt();

    for (var index = 0; index < totalChunks; index++) {
      final start = index * _chunkSizeBytes;
      final length = (start + _chunkSizeBytes > totalSize) ? totalSize - start : _chunkSizeBytes;
      final chunk = await readChunk(start, length);

      final form = FormData.fromMap({
        'index': index,
        'chunk': MultipartFile.fromBytes(chunk, filename: 'chunk_$index'),
      });
      await _postChunkWithRetry(
        '$_base/media/sessions/$ulid/chunk',
        form,
        baseBytes: start,
        totalBytes: totalSize,
        onUploadState: onUploadState,
        onProgress: onProgress,
        cancelToken: cancelToken,
      );
    }

    _reportUploadState(onUploadState, onProgress, MediaUploadPhase.finalizing, totalSize, totalSize);
    final completeRes = await api.post('$_base/media/sessions/$ulid/complete', cancelToken: cancelToken);
    final media = FamilyMediaRef.fromJson((completeRes['data'] as Map).cast<String, dynamic>());
    _reportMediaPipelineState(media, onUploadState, totalSize);
    return media;
  }

  Future<FamilyMediaRef> showMedia(int id, {CancelToken? cancelToken}) async {
    final res = await api.get('$_base/media/$id', cancelToken: cancelToken);
    return FamilyMediaRef.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  static Duration readyTimeoutFor(String? type) {
    if (type == 'video' || type == 'video_note') return const Duration(minutes: 10);
    return const Duration(minutes: 3);
  }

  /// Poll until backend pipeline marks media `ready` (optimize → storage → CDN/local).
  Future<FamilyMediaRef> waitForMediaReady(
    int id, {
    Duration? timeout,
    Duration interval = const Duration(seconds: 2),
    void Function(FamilyMediaRef media)? onUpdate,
    MediaUploadStateCallback? onUploadState,
    int totalBytes = 0,
    String? type,
    CancelToken? cancelToken,
  }) async {
    Duration effectiveTimeout = timeout ?? readyTimeoutFor(type);
    final started = DateTime.now();
    var deadline = started.add(effectiveTimeout);
    while (DateTime.now().isBefore(deadline)) {
      if (cancelToken?.isCancelled ?? false) throw ApiException.fromDio(cancelToken!.cancelError!);
      final media = await showMedia(id, cancelToken: cancelToken);
      onUpdate?.call(media);
      if (timeout == null && type == null && media.type.isNotEmpty) {
        effectiveTimeout = readyTimeoutFor(media.type);
        deadline = started.add(effectiveTimeout);
      }
      final bytes = totalBytes > 0 ? totalBytes : (media.size ?? 0);
      if (media.isReady) {
        onUploadState?.call(UploadProgress(
          phase: MediaUploadPhase.ready,
          sentBytes: bytes,
          totalBytes: bytes,
        ));
        return media;
      }
      if (media.status == 'failed') {
        onUploadState?.call(UploadProgress(
          phase: MediaUploadPhase.failed,
          sentBytes: 0,
          totalBytes: bytes,
        ));
        throw ApiException(
          message: MediaFailureMessages.pipeline(media.failureReason),
          code: 'media_failed',
        );
      }
      onUploadState?.call(UploadProgress(
        phase: MediaUploadPhase.processing,
        sentBytes: bytes,
        totalBytes: bytes,
      ));
      await Future<void>.delayed(interval);
    }
    onUploadState?.call(UploadProgress(
      phase: MediaUploadPhase.failed,
      sentBytes: 0,
      totalBytes: totalBytes,
    ));
    throw ApiException(
      message: MediaFailureMessages.timeoutWaitingReady(),
      code: 'media_timeout',
    );
  }

  Future<FamilyMediaRef> retryMedia(int id) async {
    final res = await api.post('$_base/media/$id/retry');
    return FamilyMediaRef.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  // ---------------------------------------------------------------------
  // Family panel admins (root / super-admin only)
  // ---------------------------------------------------------------------

  Future<List<FamilyManagerAdmin>> listFamilyAdmins() async {
    final res = await api.get('$_base/admins');
    return (res['data'] as List? ?? [])
        .map((e) => FamilyManagerAdmin.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<FamilyManagerAdmin> createFamilyAdmin({
    required String name,
    required String email,
    required String mobile,
    required String password,
    bool confirmPromote = false,
  }) async {
    final res = await api.post('$_base/admins', data: {
      'name': name,
      'email': email,
      'mobile': mobile,
      'password': password,
      if (confirmPromote) 'confirm_promote': true,
    });
    return FamilyManagerAdmin.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<FamilyManagerAdmin> updateFamilyAdmin(
    int id, {
    String? name,
    String? email,
    String? mobile,
  }) async {
    final res = await api.patch('$_base/admins/$id', data: {
      if (name != null) 'name': name,
      if (email != null) 'email': email,
      if (mobile != null) 'mobile': mobile,
    });
    return FamilyManagerAdmin.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> resetFamilyAdminPassword(int id, String password) async {
    await api.post('$_base/admins/$id/reset-password', data: {'password': password});
  }

  Future<FamilyManagerAdmin> setFamilyAdminStatus(int id, String status) async {
    final res = await api.post('$_base/admins/$id/status', data: {'status': status});
    return FamilyManagerAdmin.fromJson((res['data'] as Map).cast<String, dynamic>());
  }

  Future<void> deleteFamilyAdmin(int id) => api.delete('$_base/admins/$id');
}

class _CommentThreadAccumulator {
  _CommentThreadAccumulator({
    required this.postId,
    required this.familyId,
    this.familyInternalName,
    this.postType,
    this.postPreview,
    this.publishedAt,
  });

  final int postId;
  final int familyId;
  final String? familyInternalName;
  String? postType;
  String? postPreview;
  String? publishedAt;

  var matchingCount = 0;
  var pendingCount = 0;
  var unreadCount = 0;
  String? latestCommentAt;
  String? latestCommentPreview;

  void add(FamilyCommentModel comment, String tab) {
    // Count every comment that matches the tab (root + nested replies), same as
    // hub matching_count / feed approved_comments_count.
    if (_matchesTab(comment, tab)) matchingCount++;
    if (comment.status == 'pending') pendingCount++;
    if (!comment.seenByBahram) unreadCount++;
    for (final reply in comment.replies) {
      if (_matchesTab(reply, tab)) matchingCount++;
      if (reply.status == 'pending') pendingCount++;
      if (!reply.seenByBahram) unreadCount++;
      final replyCreatedAt = reply.createdAt;
      if (replyCreatedAt != null &&
          (latestCommentAt == null || replyCreatedAt.compareTo(latestCommentAt!) > 0)) {
        latestCommentAt = replyCreatedAt;
        latestCommentPreview = reply.body;
      }
    }

    postType ??= comment.postType;
    if ((postPreview == null || postPreview!.trim().isEmpty) &&
        comment.postPreview != null &&
        comment.postPreview!.trim().isNotEmpty) {
      postPreview = comment.postPreview;
    }
    publishedAt ??= comment.publishedAt;

    final createdAt = comment.createdAt;
    if (createdAt != null &&
        (latestCommentAt == null || createdAt.compareTo(latestCommentAt!) > 0)) {
      latestCommentAt = createdAt;
      latestCommentPreview = comment.body;
    }
  }

  static bool _matchesTab(FamilyCommentModel comment, String tab) {
    switch (tab) {
      case 'approved':
        return comment.status == 'approved';
      case 'rejected':
        return comment.status == 'rejected';
      case 'important':
        return comment.isImportant;
      case 'unread':
        return !comment.seenByBahram;
      case 'coaching_questions':
        return comment.signals.contains('coaching_question');
      default:
        return comment.status == 'pending';
    }
  }

  CommentThreadModel toModel() => CommentThreadModel(
        postId: postId,
        familyId: familyId,
        familyInternalName: familyInternalName,
        postType: postType,
        postPreview: postPreview,
        publishedAt: publishedAt,
        matchingCount: matchingCount,
        pendingCount: pendingCount,
        unreadCount: unreadCount,
        latestCommentAt: latestCommentAt,
        latestCommentPreview: latestCommentPreview,
      );
}
