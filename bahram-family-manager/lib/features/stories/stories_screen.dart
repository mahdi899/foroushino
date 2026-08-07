import 'dart:math' as math;
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/local_media_url.dart';
import 'package:bahram_family_manager/core/utils/picked_media.dart';
import 'package:bahram_family_manager/core/utils/story_aspect.dart';
import 'package:bahram_family_manager/core/utils/story_media_dimensions.dart';
import 'package:bahram_family_manager/features/posts/widgets/family_picker_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/models/upload_progress.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/media/story_media_preview.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

class StoriesScreen extends StatefulWidget {
  const StoriesScreen({super.key});

  @override
  State<StoriesScreen> createState() => _StoriesScreenState();
}

class _StoriesScreenState extends State<StoriesScreen> {
  Future<List<FamilyStoryModel>>? _storiesFuture;
  final _captionCtrl = TextEditingController();
  FamilyMediaRef? _storyMedia;
  Uint8List? _localPreviewBytes;
  String? _localPreviewUrl;
  bool _localPreviewOwned = false;
  int? _localWidth;
  int? _localHeight;
  var _audienceMode = 'all';
  final Set<int> _selectedFamilyIds = {};
  bool _saving = false;
  bool _uploading = false;
  double _uploadProgress = 0;
  int _uploadSentBytes = 0;
  int _uploadTotalBytes = 0;
  MediaUploadPhase _uploadPhase = MediaUploadPhase.idle;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _captionCtrl.dispose();
    if (_localPreviewOwned) {
      revokeLocalMediaUrl(_localPreviewUrl);
    }
    super.dispose();
  }

  Future<void> _clearLocalPreview() async {
    final url = _localPreviewUrl;
    final owned = _localPreviewOwned;
    _localPreviewUrl = null;
    _localPreviewBytes = null;
    _localPreviewOwned = false;
    _localWidth = null;
    _localHeight = null;
    if (owned) {
      await revokeLocalMediaUrl(url);
    }
  }

  void _load() {
    setState(() {
      _storiesFuture = context.read<AppState>().manager.listStories();
    });
  }

  String get _audiencePreviewLabel {
    if (_audienceMode == 'all') return 'همه خانواده‌ها';
    if (_audienceMode == 'include') {
      if (_selectedFamilyIds.isEmpty) return 'خانواده‌های انتخابی';
      return '${toFaDigits(_selectedFamilyIds.length.toString())} خانواده انتخابی';
    }
    if (_selectedFamilyIds.isEmpty) return 'همه به‌جز…';
    return 'همه به‌جز ${toFaDigits(_selectedFamilyIds.length.toString())} خانواده';
  }

  Future<void> _pickFamilies() async {
    final result = await showFamilyPickerSheet(context, _selectedFamilyIds);
    if (result != null && mounted) {
      setState(() {
        _selectedFamilyIds
          ..clear()
          ..addAll(result);
      });
    }
  }

  Future<void> _pickStoryMedia() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.media,
      withData: pickFilesWithData,
    );
    final picked = result?.files.singleOrNull;
    if (picked == null) return;

    final ext = picked.extension?.toLowerCase();
    final isVideo = ext == 'mp4' || ext == 'mov' || ext == 'webm' || ext == 'm4v';
    final mediaType = isVideo ? 'video' : 'image';

    final resolved = await resolvePlatformFile(picked, mediaType: mediaType);
    if (!mounted) return;
    if (resolved is ResolvePickedMediaError) {
      showAppSnackBar(context, resolved.message);
      return;
    }
    final file = (resolved as ResolvePickedMediaOk).file;

    await _clearLocalPreview();
    if (isVideo) {
      if (file.path != null && file.path!.isNotEmpty) {
        _localPreviewUrl = file.path;
        _localPreviewOwned = false;
      } else if (file.bytes != null) {
        final mime = guessMediaMimeType(file.filename, 'video');
        _localPreviewUrl = await createLocalMediaUrl(
          file.bytes!,
          mime,
          extension: ext,
        );
        _localPreviewOwned = true;
      }
    } else {
      final bytes = file.bytes;
      if (bytes == null || bytes.isEmpty) {
        showAppSnackBar(context, 'خواندن تصویر ناموفق بود.');
        return;
      }
      _localPreviewBytes = bytes;
      final dims = await readImageDimensions(bytes);
      if (dims != null) {
        _localWidth = dims.$1;
        _localHeight = dims.$2;
      }
    }

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
      _uploadSentBytes = 0;
      _uploadTotalBytes = file.size;
      _uploadPhase = MediaUploadPhase.uploading;
      _storyMedia = null;
    });

    try {
      final media = await context.read<AppState>().manager.uploadMedia(
            bytes: file.bytes,
            path: file.path,
            filename: file.filename,
            type: mediaType,
            optimizeImages: false,
            onUploadState: (upload) {
              if (!mounted) return;
              setState(() {
                _uploadPhase = upload.phase;
                _uploadProgress = upload.fraction;
                _uploadSentBytes = upload.sentBytes;
                _uploadTotalBytes = upload.totalBytes;
              });
            },
          );
      if (!mounted) return;

      FamilyMediaRef ready = media;
      if (!media.isReady) {
        ready = await context.read<AppState>().manager.waitForMediaReady(
              media.id,
              type: mediaType,
              totalBytes: file.size,
              onUpdate: (updated) {
                if (mounted) setState(() => _storyMedia = updated);
              },
              onUploadState: (upload) {
                if (!mounted) return;
                setState(() {
                  _uploadPhase = upload.phase;
                  _uploadProgress = upload.fraction;
                  _uploadSentBytes = upload.sentBytes;
                  _uploadTotalBytes = upload.totalBytes;
                });
              },
            );
      }

      if (mounted) {
        setState(() {
          _storyMedia = ready;
          if (_localWidth == null && ready.width != null) _localWidth = ready.width;
          if (_localHeight == null && ready.height != null) _localHeight = ready.height;
        });
      }
    } catch (e) {
      await _clearLocalPreview();
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  int? get _previewWidth => _localWidth ?? _storyMedia?.width;
  int? get _previewHeight => _localHeight ?? _storyMedia?.height;

  Future<void> _publishStory() async {
    if (_storyMedia == null) {
      showAppSnackBar(context, 'ابتدا تصویر یا ویدیو انتخاب کنید.');
      return;
    }

    final media = _storyMedia!;
    if (media.type == 'audio') {
      showAppSnackBar(context, 'برای استوری فقط تصویر یا ویدیو عمودی ۹:۱۶ مجاز است.');
      return;
    }
    if (!isStoryAspectRatio(_previewWidth, _previewHeight)) {
      showAppSnackBar(context, storyAspectHint(_previewWidth, _previewHeight));
      return;
    }
    if (_audienceMode != 'all' && _selectedFamilyIds.isEmpty) {
      showAppSnackBar(context, 'حداقل یک خانواده انتخاب کنید.');
      return;
    }

    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.publishStory(
            mediaId: media.id,
            caption: _captionCtrl.text.trim(),
            audienceMode: _audienceMode,
            familyIds: _audienceMode == 'all' ? const [] : _selectedFamilyIds.toList(),
          );
      if (mounted) {
        showAppSnackBar(context, 'استوری ۲۴ ساعته منتشر شد.');
        _captionCtrl.clear();
        setState(() {
          _storyMedia = null;
          _audienceMode = 'all';
          _selectedFamilyIds.clear();
        });
        await _clearLocalPreview();
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteStory(FamilyStoryModel story) async {
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.deleteStory(story.id);
      if (mounted) {
        showAppSnackBar(context, 'استوری حذف شد.');
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  EdgeInsets _listPadding(BuildContext context) => AppBreakpoints.shellTabPadding(context);

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6);

    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('استوری')),
      body: FutureBuilder<List<FamilyStoryModel>>(
        future: _storiesFuture,
        builder: (context, snapshot) => AsyncBody<List<FamilyStoryModel>>(
          snapshot: snapshot,
          emptyMessage: 'استوری فعالی نیست.',
          builder: (context, stories) {
            return ListView(
              padding: _listPadding(context),
              children: [
                PanelSectionCard(
                  title: 'استوری جدید',
                  icon: Icons.auto_stories_rounded,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      UploadZone(
                        label: 'انتخاب تصویر/ویدیو استوری (۹:۱۶ عمودی)',
                        uploading: _uploading,
                        progress: _uploadProgress,
                        sentBytes: _uploadSentBytes,
                        totalBytes: _uploadTotalBytes,
                        phase: _uploadPhase,
                        onTap: _pickStoryMedia,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'استوری در موبایل تمام‌صفحه نمایش داده می‌شود. نسبت تصویر باید ۹:۱۶ (عمودی) باشد.',
                        style: TextStyle(color: muted, fontSize: 12),
                      ),
                      if (_storyMedia != null || _localPreviewBytes != null || _localPreviewUrl != null) ...[
                        const SizedBox(height: AppSpacing.md),
                        Center(
                          child: StoryMediaPreview(
                            media: _storyMedia ?? FamilyMediaRef(
                              id: 0,
                              type: _localPreviewUrl != null ? 'video' : 'image',
                              status: 'ready',
                            ),
                            localBytes: _localPreviewBytes,
                            localUrl: _localPreviewUrl,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          storyAspectHint(_previewWidth, _previewHeight),
                          style: TextStyle(
                            color: isStoryAspectRatio(_previewWidth, _previewHeight)
                                ? AppColors.success
                                : AppColors.error,
                            fontSize: 12,
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _captionCtrl,
                        decoration: const InputDecoration(labelText: 'کپشن (اختیاری)'),
                        maxLines: 2,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      DropdownButtonFormField<String>(
                        value: _audienceMode,
                        decoration: const InputDecoration(labelText: 'مخاطب استوری'),
                        items: audienceModeLabels.entries
                            .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                            .toList(),
                        onChanged: (v) => setState(() => _audienceMode = v ?? 'all'),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Align(
                        alignment: Alignment.centerRight,
                        child: StatusChip(
                          label: _audiencePreviewLabel,
                          color: AppColors.accent,
                          icon: Icons.campaign_rounded,
                        ),
                      ),
                      if (_audienceMode != 'all') ...[
                        const SizedBox(height: AppSpacing.md),
                        SecondaryButton(
                          label: 'انتخاب خانواده‌ها (${toFaDigits(_selectedFamilyIds.length.toString())})',
                          icon: Icons.groups_rounded,
                          onPressed: _pickFamilies,
                        ),
                      ],
                      const SizedBox(height: AppSpacing.lg),
                      PrimaryButton(
                        label: 'انتشار استوری ۲۴ ساعته',
                        loading: _saving,
                        onPressed: _publishStory,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  'استوری‌های اخیر',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: AppSpacing.md),
                if (stories.isEmpty)
                  Text('استوری فعالی نیست.', style: TextStyle(color: muted))
                else
                  ...stories.map(
                    (story) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _StoryListCard(
                        story: story,
                        saving: _saving,
                        onDelete: () => _deleteStory(story),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StoryListCard extends StatefulWidget {
  const _StoryListCard({
    required this.story,
    required this.saving,
    required this.onDelete,
  });

  final FamilyStoryModel story;
  final bool saving;
  final VoidCallback onDelete;

  @override
  State<_StoryListCard> createState() => _StoryListCardState();
}

class _StoryListCardState extends State<_StoryListCard> {
  List<FamilyStoryViewerModel>? _viewers;
  var _loadingViewers = false;
  var _expanded = false;

  Future<void> _loadViewers({bool force = false}) async {
    if (_loadingViewers) return;
    if (!force && _viewers != null) return;
    setState(() => _loadingViewers = true);
    try {
      final viewers = await context.read<AppState>().manager.listStoryViewers(widget.story.id);
      if (mounted) setState(() => _viewers = viewers);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _loadingViewers = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final story = widget.story;
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6);
    final displayedViews = _viewers != null
        ? math.max(story.viewsCount, _viewers!.length)
        : story.viewsCount;

    return GlassPanel(
      borderRadius: 18,
      blur: AppGlass.panelBlur,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (story.media != null)
                SizedBox(
                  width: 80,
                  child: StoryMediaPreview(media: story.media!, maxWidth: 80, showBadge: false),
                ),
              if (story.media != null) const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      story.caption?.isNotEmpty == true ? story.caption! : 'بدون کپشن',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(formatJalaliDateTime(story.publishedAt), style: const TextStyle(fontSize: 12)),
                    const SizedBox(height: 6),
                    StatusChip(
                      label: '${toFaDigits(displayedViews.toString())} بازدید',
                      color: AppColors.primary,
                      icon: Icons.visibility_rounded,
                    ),
                    if (story.audienceSummary != null) ...[
                      const SizedBox(height: 6),
                      StatusChip(
                        label: story.audienceSummary!,
                        color: AppColors.accent,
                        icon: Icons.groups_rounded,
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded),
                onPressed: widget.saving ? null : widget.onDelete,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          InkWell(
            onTap: () {
              final next = !_expanded;
              setState(() => _expanded = next);
              if (next) _loadViewers(force: true);
            },
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Row(
                children: [
                  Icon(
                    _expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                    size: 20,
                    color: muted,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'بازدیدکنندگان',
                    style: TextStyle(fontWeight: FontWeight.w600, color: muted, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
          if (_expanded) ...[
            if (_loadingViewers)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              )
            else if (_viewers == null || _viewers!.isEmpty)
              Text('هنوز بازدیدی ثبت نشده.', style: TextStyle(color: muted, fontSize: 12))
            else
              ..._viewers!.map(
                (viewer) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          viewer.name?.isNotEmpty == true ? viewer.name! : 'کاربر',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Text(
                        viewer.mobile?.isNotEmpty == true ? toFaDigits(viewer.mobile!) : '—',
                        style: TextStyle(fontSize: 12, color: muted),
                        textDirection: TextDirection.ltr,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
