/// Hand-written JSON models — no codegen (build_runner isn't available in
/// this environment). Field names mirror the raw Eloquent JSON the backend
/// sends for Family Manager endpoints (see docs/FAMILY.md in the main repo).
library models;

class ManagerUser {
  ManagerUser({
    required this.id,
    required this.name,
    required this.email,
    required this.mobile,
    required this.roles,
    required this.permissions,
    required this.isSuperAdmin,
  });

  final int id;
  final String name;
  final String email;
  final String? mobile;
  final List<String> roles;
  final List<String> permissions;
  final bool isSuperAdmin;

  factory ManagerUser.fromJson(Map<String, dynamic> json) => ManagerUser(
        id: json['id'] as int,
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        mobile: json['mobile']?.toString(),
        roles: (json['roles'] as List? ?? []).map((e) => e.toString()).toList(),
        permissions: (json['permissions'] as List? ?? []).map((e) => e.toString()).toList(),
        isSuperAdmin: json['is_super_admin'] == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'mobile': mobile,
        'roles': roles,
        'permissions': permissions,
        'is_super_admin': isSuperAdmin,
      };

  bool can(String permission) => isSuperAdmin || permissions.contains(permission);
}

class MathChallenge {
  MathChallenge({required this.id, required this.question});

  final String id;
  final String question;

  factory MathChallenge.fromJson(Map<String, dynamic> json) => MathChallenge(
        id: json['id']?.toString() ?? '',
        question: json['question']?.toString() ?? '',
      );
}

class HomeStats {
  HomeStats({
    required this.postsToday,
    required this.reactionsToday,
    required this.newCommentsToday,
    required this.pendingComments,
    required this.actionsCompletedToday,
    required this.aiSummary,
  });

  final int postsToday;
  final int reactionsToday;
  final int newCommentsToday;
  final int pendingComments;
  final int actionsCompletedToday;
  final AiDailySummary aiSummary;

  factory HomeStats.fromJson(Map<String, dynamic> json) => HomeStats(
        postsToday: (json['posts_today'] as num?)?.toInt() ?? 0,
        reactionsToday: (json['reactions_today'] as num?)?.toInt() ?? 0,
        newCommentsToday: (json['new_comments_today'] as num?)?.toInt() ?? 0,
        pendingComments: (json['pending_comments'] as num?)?.toInt() ?? 0,
        actionsCompletedToday: (json['actions_completed_today'] as num?)?.toInt() ?? 0,
        aiSummary: AiDailySummary.fromJson((json['ai_summary'] as Map?)?.cast<String, dynamic>() ?? {}),
      );
}

class AiDailySummary {
  AiDailySummary({required this.topics, required this.sampleSize, required this.lowSample, this.suggestion, this.note});

  final List<AiTopic> topics;
  final int sampleSize;
  final bool lowSample;
  final String? suggestion;
  final String? note;

  factory AiDailySummary.fromJson(Map<String, dynamic> json) => AiDailySummary(
        topics: (json['topics'] as List? ?? [])
            .map((e) => AiTopic.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        sampleSize: (json['sample_size'] as num?)?.toInt() ?? 0,
        lowSample: json['low_sample'] == true,
        suggestion: json['suggestion']?.toString(),
        note: json['note']?.toString(),
      );
}

class AiTopic {
  AiTopic({required this.topic, required this.percent});

  final String topic;
  final double percent;

  factory AiTopic.fromJson(Map<String, dynamic> json) => AiTopic(
        topic: json['topic']?.toString() ?? '',
        percent: (json['percent'] as num?)?.toDouble() ?? 0,
      );
}

class FamilyMediaRef {
  FamilyMediaRef({
    required this.id,
    required this.type,
    required this.status,
    this.originalFilename,
    this.size,
    this.duration,
    this.width,
    this.height,
    this.failureReason,
    this.cdnUrl,
  });

  final int id;
  final String type;
  final String status;
  final String? originalFilename;
  final int? size;
  final int? duration;
  final int? width;
  final int? height;
  final String? failureReason;
  final String? cdnUrl;

  bool get isReady => status == 'ready';

  factory FamilyMediaRef.fromJson(Map<String, dynamic> json) => FamilyMediaRef(
        id: json['id'] as int,
        type: json['type']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        originalFilename: json['original_filename']?.toString(),
        size: (json['size'] as num?)?.toInt(),
        duration: (json['duration'] as num?)?.toInt(),
        width: (json['width'] as num?)?.toInt(),
        height: (json['height'] as num?)?.toInt(),
        failureReason: json['failure_reason']?.toString(),
        cdnUrl: json['cdn_url']?.toString() ?? json['url']?.toString(),
      );
}

class FamilyPostBlockModel {
  FamilyPostBlockModel({
    required this.id,
    required this.type,
    required this.position,
    this.textContent,
    this.mediaId,
    this.media,
    this.articleId,
    this.commentId,
    this.actionId,
  });

  final int id;
  final String type;
  final int position;
  final String? textContent;
  final int? mediaId;
  final FamilyMediaRef? media;
  final int? articleId;
  final int? commentId;
  final int? actionId;

  factory FamilyPostBlockModel.fromJson(Map<String, dynamic> json) => FamilyPostBlockModel(
        id: (json['id'] as num?)?.toInt() ?? 0,
        type: json['type']?.toString() ?? 'text',
        position: (json['position'] as num?)?.toInt() ?? 0,
        textContent: json['text_content']?.toString(),
        mediaId: (json['media_id'] as num?)?.toInt(),
        media: json['media'] is Map ? FamilyMediaRef.fromJson((json['media'] as Map).cast<String, dynamic>()) : null,
        articleId: (json['article_id'] as num?)?.toInt(),
        commentId: (json['comment_id'] as num?)?.toInt(),
        actionId: (json['action_id'] as num?)?.toInt(),
      );
}

class FamilyActionOptionModel {
  FamilyActionOptionModel({required this.label, required this.value, required this.position});

  final String label;
  final String value;
  final int position;

  factory FamilyActionOptionModel.fromJson(Map<String, dynamic> json) => FamilyActionOptionModel(
        label: json['label']?.toString() ?? '',
        value: json['value']?.toString() ?? '',
        position: (json['position'] as num?)?.toInt() ?? 0,
      );
}

class FamilyActionModel {
  FamilyActionModel({required this.id, required this.type, required this.prompt, required this.options});

  final int id;
  final String type;
  final String prompt;
  final List<FamilyActionOptionModel> options;

  factory FamilyActionModel.fromJson(Map<String, dynamic> json) => FamilyActionModel(
        id: (json['id'] as num?)?.toInt() ?? 0,
        type: json['type']?.toString() ?? '',
        prompt: json['prompt']?.toString() ?? '',
        options: (json['options'] as List? ?? [])
            .map((e) => FamilyActionOptionModel.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class FamilyPostTargetModel {
  const FamilyPostTargetModel({required this.familyId, this.familyName});

  final int familyId;
  final String? familyName;

  factory FamilyPostTargetModel.fromJson(Map<String, dynamic> json) => FamilyPostTargetModel(
        familyId: (json['family_id'] as num).toInt(),
        familyName: json['family_name']?.toString(),
      );
}

class FamilyPostModel {
  FamilyPostModel({
    required this.id,
    required this.type,
    required this.status,
    required this.audienceMode,
    required this.isImportant,
    this.audienceSummary,
    this.isPinned = false,
    this.publishedAt,
    this.createdAt,
    this.authorName,
    this.blocks = const [],
    this.actions = const [],
    this.targetFamilies = const [],
    this.targetFamilyIds = const [],
  });

  final int id;
  final String type;
  final String status;
  final String audienceMode;
  final String? audienceSummary;
  final bool isImportant;
  final bool isPinned;
  final String? publishedAt;
  final String? createdAt;
  final String? authorName;
  final List<FamilyPostBlockModel> blocks;
  final List<FamilyActionModel> actions;
  final List<FamilyPostTargetModel> targetFamilies;
  final List<int> targetFamilyIds;

  bool get isDraft => status == 'draft';
  bool get isPublished => status == 'published';
  bool get isArchived => status == 'archived';

  String get channelLabel {
    if (audienceSummary != null && audienceSummary!.isNotEmpty) {
      return audienceSummary!;
    }
    if (audienceMode == 'all') return 'همه خانواده‌ها';
    final names = targetFamilies
        .map((target) => target.familyName)
        .whereType<String>()
        .where((name) => name.isNotEmpty)
        .toList();
    if (audienceMode == 'include') {
      return names.isEmpty ? 'خانواده‌های انتخابی' : names.join('، ');
    }
    if (audienceMode == 'exclude') {
      return names.isEmpty ? 'همه به‌جز…' : 'همه به‌جز ${names.join('، ')}';
    }
    return audienceMode;
  }

  factory FamilyPostModel.fromJson(Map<String, dynamic> json) {
    final targets = (json['targets'] as List? ?? [])
        .map((e) => FamilyPostTargetModel.fromJson((e as Map).cast<String, dynamic>()))
        .toList();

    return FamilyPostModel(
        id: json['id'] as int,
        type: json['type']?.toString() ?? 'text',
        status: json['status']?.toString() ?? 'draft',
        audienceMode: json['audience_mode']?.toString() ?? 'all',
        audienceSummary: json['audience_summary']?.toString(),
        isImportant: json['is_important'] == true,
        isPinned: json['is_pinned'] == true,
        publishedAt: json['published_at']?.toString(),
        createdAt: json['created_at']?.toString(),
        authorName: (json['author'] as Map?)?['name']?.toString(),
        blocks: (json['blocks'] as List? ?? [])
            .map((e) => FamilyPostBlockModel.fromJson((e as Map).cast<String, dynamic>()))
            .toList()
          ..sort((a, b) => a.position.compareTo(b.position)),
        actions: (json['actions'] as List? ?? [])
            .map((e) => FamilyActionModel.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        targetFamilies: targets,
        targetFamilyIds: targets.map((target) => target.familyId).toList(),
      );
  }

  String get preview {
    final textBlock = blocks.firstWhereOrNull((b) => b.type == 'text');
    if (textBlock?.textContent != null && textBlock!.textContent!.isNotEmpty) {
      return textBlock.textContent!;
    }
    if (blocks.isEmpty) return '(بدون محتوا)';
    return switch (blocks.first.type) {
      'audio' => 'پیام صوتی',
      'video' => 'ویدیو',
      'image' => 'تصویر',
      'article_reference' => 'اشاره به مقاله',
      _ => '(بدون متن)',
    };
  }
}

class FamilyCommentModel {
  FamilyCommentModel({
    required this.id,
    required this.body,
    required this.status,
    this.createdAt,
    required this.isImportant,
    required this.inPulse,
    required this.seenByBahram,
    this.userName,
    this.familyInternalName,
    required this.postId,
    this.riskScore,
    this.sentiment,
    this.topic,
    this.signals = const [],
    this.rejectionReason,
    this.rejectionNote,
  });

  final int id;
  final String body;
  final String status;
  final String? createdAt;
  final bool isImportant;
  final bool inPulse;
  final bool seenByBahram;
  final String? userName;
  final String? familyInternalName;
  final int postId;
  final double? riskScore;
  final String? sentiment;
  final String? topic;
  final List<String> signals;
  final String? rejectionReason;
  final String? rejectionNote;

  factory FamilyCommentModel.fromJson(Map<String, dynamic> json) {
    final ai = (json['ai'] as Map?)?.cast<String, dynamic>() ?? {};
    return FamilyCommentModel(
      id: json['id'] as int,
      body: json['body']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at']?.toString(),
      isImportant: json['is_important'] == true,
      inPulse: json['in_pulse'] == true,
      seenByBahram: json['seen_by_bahram'] == true,
      userName: (json['user'] as Map?)?['name']?.toString(),
      familyInternalName: (json['family'] as Map?)?['internal_name']?.toString(),
      postId: (json['post_id'] as num?)?.toInt() ?? 0,
      riskScore: (ai['risk_score'] as num?)?.toDouble(),
      sentiment: ai['sentiment']?.toString(),
      topic: ai['topic']?.toString(),
      signals: (ai['signals'] as List? ?? []).map((e) => e.toString()).toList(),
      rejectionReason: json['rejection_reason']?.toString(),
      rejectionNote: json['rejection_note']?.toString(),
    );
  }
}

class FamilyProfileModel {
  const FamilyProfileModel({this.description, this.notes});

  final String? description;
  final String? notes;

  factory FamilyProfileModel.fromJson(Map<String, dynamic>? json) => FamilyProfileModel(
        description: json?['description']?.toString(),
        notes: json?['notes']?.toString(),
      );

  Map<String, dynamic> toPayload() => {
        if (description != null) 'profile_description': description,
        if (notes != null) 'profile_notes': notes,
      };
}

class FamilyEntryEventModel {
  FamilyEntryEventModel({
    required this.id,
    required this.name,
    this.externalReference,
    this.type,
    this.topic,
  });

  final int id;
  final String name;
  final String? externalReference;
  final String? type;
  final String? topic;

  factory FamilyEntryEventModel.fromJson(Map<String, dynamic> json) => FamilyEntryEventModel(
        id: (json['id'] as num).toInt(),
        name: json['name']?.toString() ?? '',
        externalReference: json['external_reference']?.toString(),
        type: json['type']?.toString(),
        topic: json['topic']?.toString(),
      );
}

class FamilySummaryModel {
  FamilySummaryModel({
    required this.id,
    required this.internalName,
    required this.lifecycle,
    required this.memberCount,
    required this.capacityTarget,
    required this.capacityMin,
    required this.capacityMax,
    this.primarySource,
    this.entryEventId,
    this.acceptingMembers = true,
    this.profile = const FamilyProfileModel(),
    this.entryEvent,
  });

  final int id;
  final String internalName;
  final String lifecycle;
  final int memberCount;
  final int capacityTarget;
  final int capacityMin;
  final int capacityMax;
  final String? primarySource;
  final int? entryEventId;
  final bool acceptingMembers;
  final FamilyProfileModel profile;
  final FamilyEntryEventModel? entryEvent;

  factory FamilySummaryModel.fromJson(Map<String, dynamic> json) => FamilySummaryModel(
        id: json['id'] as int,
        internalName: json['internal_name']?.toString() ?? '',
        lifecycle: json['lifecycle']?.toString() ?? '',
        memberCount: (json['member_count'] as num?)?.toInt() ?? 0,
        capacityTarget: (json['capacity_target'] as num?)?.toInt() ?? 0,
        capacityMin: (json['capacity_min'] as num?)?.toInt() ?? 0,
        capacityMax: (json['capacity_max'] as num?)?.toInt() ?? 0,
        primarySource: json['primary_source']?.toString(),
        entryEventId: (json['entry_event_id'] as num?)?.toInt(),
        acceptingMembers: json['accepting_members'] as bool? ?? true,
        profile: FamilyProfileModel.fromJson(
          json['profile'] is Map ? (json['profile'] as Map).cast<String, dynamic>() : null,
        ),
        entryEvent: json['entry_event'] is Map
            ? FamilyEntryEventModel.fromJson((json['entry_event'] as Map).cast<String, dynamic>())
            : null,
      );
}

class FamilyDnaModel {
  FamilyDnaModel({
    required this.voiceEngagement,
    required this.videoEngagement,
    required this.reactionRate,
    required this.commentRate,
    required this.actionCommitment,
    required this.actionCompletion,
  });

  final double voiceEngagement;
  final double videoEngagement;
  final double reactionRate;
  final double commentRate;
  final double actionCommitment;
  final double actionCompletion;

  factory FamilyDnaModel.fromJson(Map<String, dynamic> json) => FamilyDnaModel(
        voiceEngagement: (json['voice_engagement'] as num?)?.toDouble() ?? 0,
        videoEngagement: (json['video_engagement'] as num?)?.toDouble() ?? 0,
        reactionRate: (json['reaction_rate'] as num?)?.toDouble() ?? 0,
        commentRate: (json['comment_rate'] as num?)?.toDouble() ?? 0,
        actionCommitment: (json['action_commitment'] as num?)?.toDouble() ?? 0,
        actionCompletion: (json['action_completion'] as num?)?.toDouble() ?? 0,
      );
}

class FamilyDetailModel extends FamilySummaryModel {
  FamilyDetailModel({
    required super.id,
    required super.internalName,
    required super.lifecycle,
    required super.memberCount,
    required super.capacityTarget,
    required super.capacityMin,
    required super.capacityMax,
    super.primarySource,
    super.entryEventId,
    super.acceptingMembers,
    super.profile,
    super.entryEvent,
    required this.newMembers7d,
    this.dna,
  });

  final int newMembers7d;
  final FamilyDnaModel? dna;

  factory FamilyDetailModel.fromJson(Map<String, dynamic> json) => FamilyDetailModel(
        id: json['id'] as int,
        internalName: json['internal_name']?.toString() ?? '',
        lifecycle: json['lifecycle']?.toString() ?? '',
        memberCount: (json['member_count'] as num?)?.toInt() ?? 0,
        capacityTarget: (json['capacity_target'] as num?)?.toInt() ?? 0,
        capacityMin: (json['capacity_min'] as num?)?.toInt() ?? 0,
        capacityMax: (json['capacity_max'] as num?)?.toInt() ?? 0,
        primarySource: json['primary_source']?.toString(),
        entryEventId: (json['entry_event_id'] as num?)?.toInt(),
        acceptingMembers: json['accepting_members'] as bool? ?? true,
        profile: FamilyProfileModel.fromJson(
          json['profile'] is Map ? (json['profile'] as Map).cast<String, dynamic>() : null,
        ),
        entryEvent: json['entry_event'] is Map
            ? FamilyEntryEventModel.fromJson((json['entry_event'] as Map).cast<String, dynamic>())
            : null,
        newMembers7d: (json['new_members_7d'] as num?)?.toInt() ?? 0,
        dna: json['dna'] is Map ? FamilyDnaModel.fromJson((json['dna'] as Map).cast<String, dynamic>()) : null,
      );
}

class AudienceSuggestion {
  AudienceSuggestion({required this.key, required this.label, required this.familyIds});

  final String key;
  final String label;
  final List<int> familyIds;

  factory AudienceSuggestion.fromJson(Map<String, dynamic> json) => AudienceSuggestion(
        key: json['key']?.toString() ?? '',
        label: json['label']?.toString() ?? '',
        familyIds: (json['family_ids'] as List? ?? []).map((e) => (e as num).toInt()).toList(),
      );
}

class DailyMetricPoint {
  DailyMetricPoint({
    required this.date,
    required this.newMembers,
    required this.postsPublished,
    required this.reactions,
    required this.commentsApproved,
    required this.commentsPending,
    required this.actionsCompleted,
  });

  final String date;
  final int newMembers;
  final int postsPublished;
  final int reactions;
  final int commentsApproved;
  final int commentsPending;
  final int actionsCompleted;

  factory DailyMetricPoint.fromJson(Map<String, dynamic> json) => DailyMetricPoint(
        date: json['date']?.toString() ?? '',
        newMembers: (json['new_members'] as num?)?.toInt() ?? 0,
        postsPublished: (json['posts_published'] as num?)?.toInt() ?? 0,
        reactions: (json['reactions'] as num?)?.toInt() ?? 0,
        commentsApproved: (json['comments_approved'] as num?)?.toInt() ?? 0,
        commentsPending: (json['comments_pending'] as num?)?.toInt() ?? 0,
        actionsCompleted: (json['actions_completed'] as num?)?.toInt() ?? 0,
      );
}

class SourceMetric {
  SourceMetric({required this.source, required this.joins, this.sourceLabel});

  final String source;
  final String? sourceLabel;
  final int joins;

  String get displayLabel => sourceLabel ?? source;

  factory SourceMetric.fromJson(Map<String, dynamic> json) => SourceMetric(
        source: json['source']?.toString() ?? 'نامشخص',
        sourceLabel: json['source_label']?.toString(),
        joins: (json['joins'] as num?)?.toInt() ?? 0,
      );
}

class EntryLinkModel {
  EntryLinkModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.source,
    this.sourceLabel,
    this.campaign,
    this.topic,
    required this.entryEventId,
    required this.isActive,
    required this.url,
    required this.joinsTotal,
    required this.joinsPeriod,
    this.createdAt,
  });

  final int id;
  final String name;
  final String slug;
  final String source;
  final String? sourceLabel;
  final String? campaign;
  final String? topic;
  final int entryEventId;
  final bool isActive;
  final String url;
  final int joinsTotal;
  final int joinsPeriod;
  final String? createdAt;

  factory EntryLinkModel.fromJson(Map<String, dynamic> json) => EntryLinkModel(
        id: (json['id'] as num).toInt(),
        name: json['name']?.toString() ?? '',
        slug: json['slug']?.toString() ?? '',
        source: json['source']?.toString() ?? '',
        sourceLabel: json['source_label']?.toString(),
        campaign: json['campaign']?.toString(),
        topic: json['topic']?.toString(),
        entryEventId: (json['entry_event_id'] as num?)?.toInt() ?? 0,
        isActive: json['is_active'] as bool? ?? true,
        url: json['url']?.toString() ?? '',
        joinsTotal: (json['joins_total'] as num?)?.toInt() ?? 0,
        joinsPeriod: (json['joins_period'] as num?)?.toInt() ?? 0,
        createdAt: json['created_at']?.toString(),
      );
}

class EntryEventMetric {
  EntryEventMetric({required this.name, required this.joins});

  final String name;
  final int joins;

  factory EntryEventMetric.fromJson(Map<String, dynamic> json) => EntryEventMetric(
        name: json['name']?.toString() ?? 'نامشخص',
        joins: (json['joins'] as num?)?.toInt() ?? 0,
      );
}

class AnalyticsData {
  AnalyticsData({required this.daily, required this.sources, required this.entryEvents});

  final List<DailyMetricPoint> daily;
  final List<SourceMetric> sources;
  final List<EntryEventMetric> entryEvents;

  factory AnalyticsData.fromJson(Map<String, dynamic> json) => AnalyticsData(
        daily: (json['daily'] as List? ?? [])
            .map((e) => DailyMetricPoint.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        sources: (json['sources'] as List? ?? [])
            .map((e) => SourceMetric.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        entryEvents: (json['entry_events'] as List? ?? [])
            .map((e) => EntryEventMetric.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class FamilyMediaPipelineSettings {
  const FamilyMediaPipelineSettings({
    required this.optimizeImages,
    required this.syncToSiteLibrary,
    required this.ftpUploadEnabled,
    this.uploadDisk = 'public',
    this.siteLibraryDisk = 'public',
    this.cdnUrl,
  });

  final bool optimizeImages;
  final bool syncToSiteLibrary;
  final bool ftpUploadEnabled;
  final String uploadDisk;
  final String siteLibraryDisk;
  final String? cdnUrl;

  factory FamilyMediaPipelineSettings.fromJson(Map<String, dynamic> json) => FamilyMediaPipelineSettings(
        optimizeImages: json['optimize_images'] == true,
        syncToSiteLibrary: json['sync_to_site_library'] != false,
        ftpUploadEnabled: json['ftp_upload_enabled'] != false,
        uploadDisk: json['upload_disk']?.toString() ?? 'public',
        siteLibraryDisk: json['site_library_disk']?.toString() ?? 'public',
        cdnUrl: json['cdn_url']?.toString(),
      );
}

class FamilyBrandingSettings {
  FamilyBrandingSettings({
    required this.displayName,
    required this.profileName,
    this.profileAvatar,
    this.communityAvatar,
    this.mediaPipeline,
  });

  final String displayName;
  final String profileName;
  final String? profileAvatar;
  final String? communityAvatar;
  final FamilyMediaPipelineSettings? mediaPipeline;

  factory FamilyBrandingSettings.fromJson(Map<String, dynamic> json) => FamilyBrandingSettings(
        displayName: json['display_name']?.toString() ?? '',
        profileName: json['profile_name']?.toString() ?? '',
        profileAvatar: json['profile_avatar']?.toString(),
        communityAvatar: json['community_avatar']?.toString(),
        mediaPipeline: json['media_pipeline'] is Map
            ? FamilyMediaPipelineSettings.fromJson((json['media_pipeline'] as Map).cast<String, dynamic>())
            : null,
      );
}

class FamilyStoryModel {
  FamilyStoryModel({
    required this.id,
    this.caption,
    this.publishedAt,
    this.expiresAt,
    this.media,
  });

  final int id;
  final String? caption;
  final String? publishedAt;
  final String? expiresAt;
  final FamilyMediaRef? media;

  factory FamilyStoryModel.fromJson(Map<String, dynamic> json) => FamilyStoryModel(
        id: json['id'] as int,
        caption: json['caption']?.toString(),
        publishedAt: json['published_at']?.toString(),
        expiresAt: json['expires_at']?.toString(),
        media: json['media'] is Map
            ? FamilyMediaRef.fromJson((json['media'] as Map).cast<String, dynamic>())
            : null,
      );
}

class FamilyMemberModel {
  FamilyMemberModel({
    required this.id,
    required this.userId,
    required this.familyId,
    this.familyName,
    this.name,
    this.mobile,
    this.mobileMasked,
    this.entrySource,
    this.joinedAt,
    this.onboardingCompleted = false,
  });

  final int id;
  final int userId;
  final int familyId;
  final String? familyName;
  final String? name;
  final String? mobile;
  final String? mobileMasked;
  final String? entrySource;
  final String? joinedAt;
  final bool onboardingCompleted;

  String? get displayMobile => (mobile != null && mobile!.isNotEmpty) ? mobile : mobileMasked;

  factory FamilyMemberModel.fromJson(Map<String, dynamic> json) => FamilyMemberModel(
        id: (json['id'] as num).toInt(),
        userId: (json['user_id'] as num).toInt(),
        familyId: (json['family_id'] as num).toInt(),
        familyName: json['family_name']?.toString(),
        name: json['name']?.toString(),
        mobile: json['mobile']?.toString(),
        mobileMasked: json['mobile_masked']?.toString(),
        entrySource: json['entry_source']?.toString(),
        joinedAt: json['joined_at']?.toString(),
        onboardingCompleted: json['onboarding_completed'] == true,
      );
}

class FamilyActionStatOptionModel {
  FamilyActionStatOptionModel({
    required this.value,
    required this.label,
    required this.count,
    required this.percent,
  });

  final String value;
  final String label;
  final int count;
  final int percent;

  factory FamilyActionStatOptionModel.fromJson(Map<String, dynamic> json) => FamilyActionStatOptionModel(
        value: json['value']?.toString() ?? '',
        label: json['label']?.toString() ?? '',
        count: (json['count'] as num?)?.toInt() ?? 0,
        percent: (json['percent'] as num?)?.toInt() ?? 0,
      );
}

class FamilyActionStatsModel {
  FamilyActionStatsModel({required this.total, required this.options});

  final int total;
  final List<FamilyActionStatOptionModel> options;

  factory FamilyActionStatsModel.fromJson(Map<String, dynamic> json) => FamilyActionStatsModel(
        total: (json['total'] as num?)?.toInt() ?? 0,
        options: (json['options'] as List? ?? [])
            .map((e) => FamilyActionStatOptionModel.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class FamilyActionResponseRowModel {
  FamilyActionResponseRowModel({
    required this.id,
    required this.userId,
    this.name,
    this.mobile,
    this.familyName,
    this.valueLabel,
    this.respondedAt,
  });

  final int id;
  final int userId;
  final String? name;
  final String? mobile;
  final String? familyName;
  final String? valueLabel;
  final String? respondedAt;

  factory FamilyActionResponseRowModel.fromJson(Map<String, dynamic> json) => FamilyActionResponseRowModel(
        id: (json['id'] as num).toInt(),
        userId: (json['user_id'] as num).toInt(),
        name: json['name']?.toString(),
        mobile: json['mobile']?.toString(),
        familyName: json['family_name']?.toString(),
        valueLabel: json['value_label']?.toString(),
        respondedAt: json['responded_at']?.toString(),
      );
}

class FamilyActionResultModel {
  FamilyActionResultModel({
    required this.id,
    required this.type,
    required this.prompt,
    required this.responseCount,
    this.stats,
    required this.responses,
  });

  final int id;
  final String type;
  final String prompt;
  final int responseCount;
  final FamilyActionStatsModel? stats;
  final List<FamilyActionResponseRowModel> responses;

  factory FamilyActionResultModel.fromJson(Map<String, dynamic> json) => FamilyActionResultModel(
        id: (json['id'] as num).toInt(),
        type: json['type']?.toString() ?? '',
        prompt: json['prompt']?.toString() ?? '',
        responseCount: (json['response_count'] as num?)?.toInt() ?? 0,
        stats: json['stats'] is Map
            ? FamilyActionStatsModel.fromJson((json['stats'] as Map).cast<String, dynamic>())
            : null,
        responses: (json['responses'] as List? ?? [])
            .map((e) => FamilyActionResponseRowModel.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class PaginatedResult<T> {
  PaginatedResult({required this.items, required this.currentPage, required this.lastPage, required this.total});

  final List<T> items;
  final int currentPage;
  final int lastPage;
  final int total;

  bool get hasMore => currentPage < lastPage;

  factory PaginatedResult.fromEnvelope(
    Map<String, dynamic> envelope,
    T Function(Map<String, dynamic>) mapItem,
  ) {
    final data = envelope['data'] as List? ?? [];
    final meta = (envelope['meta'] as Map?)?.cast<String, dynamic>() ?? {};
    return PaginatedResult(
      items: data.map((e) => mapItem((e as Map).cast<String, dynamic>())).toList(),
      currentPage: (meta['current_page'] as num?)?.toInt() ?? 1,
      lastPage: (meta['last_page'] as num?)?.toInt() ?? 1,
      total: (meta['total'] as num?)?.toInt() ?? 0,
    );
  }
}

extension FirstWhereOrNullExtension<E> on List<E> {
  E? firstWhereOrNull(bool Function(E) test) {
    for (final e in this) {
      if (test(e)) return e;
    }
    return null;
  }
}
