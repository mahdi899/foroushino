import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/story_aspect.dart';
import 'package:bahram_family_manager/features/posts/widgets/family_picker_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
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
  var _audienceMode = 'all';
  final Set<int> _selectedFamilyIds = {};
  bool _saving = false;
  bool _uploading = false;
  double _uploadProgress = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _captionCtrl.dispose();
    super.dispose();
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
    final result = await FilePicker.platform.pickFiles(type: FileType.media, withData: true);
    final picked = result?.files.singleOrNull;
    if (picked?.bytes == null) return;

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
    });

    try {
      final isVideo = picked!.extension?.toLowerCase() == 'mp4' ||
          picked.extension?.toLowerCase() == 'mov' ||
          picked.extension?.toLowerCase() == 'webm';
      final media = await context.read<AppState>().manager.uploadMedia(
            bytes: picked.bytes!,
            filename: picked.name,
            type: isVideo ? 'video' : 'image',
            onProgress: (p) {
              if (mounted) setState(() => _uploadProgress = p);
            },
          );
      if (mounted) setState(() => _storyMedia = media);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

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
    if (!isStoryAspectRatio(media.width, media.height)) {
      showAppSnackBar(context, storyAspectHint(media.width, media.height));
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

  EdgeInsets _listPadding(BuildContext context) {
    final base = AppBreakpoints.pagePadding(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final extraBottom = AppBreakpoints.isDesktop(context) ? 0.0 : 88 + bottomInset;
    return base.copyWith(bottom: base.bottom + extraBottom);
  }

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
                        onTap: _pickStoryMedia,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'استوری در موبایل تمام‌صفحه نمایش داده می‌شود. نسبت تصویر باید ۹:۱۶ (عمودی) باشد.',
                        style: TextStyle(color: muted, fontSize: 12),
                      ),
                      if (_storyMedia != null) ...[
                        const SizedBox(height: AppSpacing.md),
                        Center(child: StoryMediaPreview(media: _storyMedia!)),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          storyAspectHint(_storyMedia!.width, _storyMedia!.height),
                          style: TextStyle(
                            color: isStoryAspectRatio(_storyMedia!.width, _storyMedia!.height)
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
                      child: GlassPanel(
                        borderRadius: 18,
                        blur: 0,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Row(
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
                                  Text(formatDateTime(story.publishedAt), style: const TextStyle(fontSize: 12)),
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
                              onPressed: _saving ? null : () => _deleteStory(story),
                            ),
                          ],
                        ),
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
