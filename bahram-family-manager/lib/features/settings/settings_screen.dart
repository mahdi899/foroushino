import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/core/utils/story_aspect.dart';
import 'package:bahram_family_manager/widgets/media/story_media_preview.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  Future<FamilyBrandingSettings>? _settingsFuture;
  Future<List<FamilyStoryModel>>? _storiesFuture;

  final _displayNameCtrl = TextEditingController();
  final _profileNameCtrl = TextEditingController();
  final _storyCaptionCtrl = TextEditingController();

  int? _profileMediaId;
  int? _communityMediaId;
  FamilyMediaRef? _profilePreview;
  FamilyMediaRef? _communityPreview;
  FamilyMediaRef? _storyMedia;
  bool _saving = false;
  bool _uploading = false;
  double _uploadProgress = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _displayNameCtrl.dispose();
    _profileNameCtrl.dispose();
    _storyCaptionCtrl.dispose();
    super.dispose();
  }

  void _load() {
    setState(() {
      _settingsFuture = context.read<AppState>().manager.getSettings();
      _storiesFuture = context.read<AppState>().manager.listStories();
    });
  }

  Future<void> _pickAvatar({required bool community}) async {
    final result = await FilePicker.platform.pickFiles(type: FileType.image, withData: true);
    final picked = result?.files.singleOrNull;
    if (picked?.bytes == null) return;

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
    });

    try {
      final media = await context.read<AppState>().manager.uploadMedia(
            bytes: picked!.bytes!,
            filename: picked.name,
            type: 'image',
            onProgress: (p) {
              if (mounted) setState(() => _uploadProgress = p);
            },
          );
      if (!mounted) return;
      setState(() {
        if (community) {
          _communityMediaId = media.id;
          _communityPreview = media;
        } else {
          _profileMediaId = media.id;
          _profilePreview = media;
        }
      });
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.updateSettings({
        'display_name': _displayNameCtrl.text.trim(),
        'profile_name': _profileNameCtrl.text.trim(),
        if (_profileMediaId != null) 'profile_media_id': _profileMediaId,
        if (_communityMediaId != null) 'community_media_id': _communityMediaId,
      });
      if (mounted) {
        showAppSnackBar(context, 'تنظیمات ذخیره شد.');
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
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

    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.publishStory(
            mediaId: _storyMedia!.id,
            caption: _storyCaptionCtrl.text.trim(),
          );
      if (mounted) {
        showAppSnackBar(context, 'استوری ۲۴ ساعته منتشر شد.');
        _storyCaptionCtrl.clear();
        setState(() => _storyMedia = null);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('برندینگ و استوری'),
        bottom: AppTabBar(
          controller: _tabController,
          tabs: const ['پروفایل خانواده', 'استوری ۲۴ساعته'],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          FutureBuilder<FamilyBrandingSettings>(
            future: _settingsFuture,
            builder: (context, snapshot) => AsyncBody<FamilyBrandingSettings>(
              snapshot: snapshot,
              builder: (context, settings) {
                if (_displayNameCtrl.text.isEmpty) {
                  _displayNameCtrl.text = settings.displayName;
                  _profileNameCtrl.text = settings.profileName;
                }

                return ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  children: [
                    TextField(
                      controller: _displayNameCtrl,
                      decoration: const InputDecoration(labelText: 'نام خانواده (مثلاً خانواده داداش بهرام)'),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: _profileNameCtrl,
                      decoration: const InputDecoration(labelText: 'نام مدیر (مثلاً بهرام)'),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const Text('آواتار پروفایل مدیر', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: AppSpacing.sm),
                    if (_profilePreview?.cdnUrl != null || settings.profileAvatar != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            _profilePreview?.cdnUrl ?? settings.profileAvatar!,
                            height: 96,
                            width: 96,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    UploadZone(
                      label: 'آپلود آواتار مدیر',
                      uploading: _uploading,
                      progress: _uploadProgress,
                      onTap: () => _pickAvatar(community: false),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    const Text('آواتار پروفایل خانواده (حلقه استوری)', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: AppSpacing.sm),
                    if (_communityPreview?.cdnUrl != null || settings.communityAvatar != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            _communityPreview?.cdnUrl ?? settings.communityAvatar!,
                            height: 96,
                            width: 96,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    UploadZone(
                      label: 'آپلود آواتار خانواده',
                      uploading: _uploading,
                      progress: _uploadProgress,
                      onTap: () => _pickAvatar(community: true),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    PrimaryButton(label: 'ذخیره تنظیمات', loading: _saving, onPressed: _saveSettings),
                  ],
                );
              },
            ),
          ),
          FutureBuilder<List<FamilyStoryModel>>(
            future: _storiesFuture,
            builder: (context, snapshot) => AsyncBody<List<FamilyStoryModel>>(
              snapshot: snapshot,
              emptyMessage: 'استوری فعالی نیست.',
              builder: (context, stories) {
                return ListView(
                  padding: const EdgeInsets.all(AppSpacing.lg),
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
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65), fontSize: 13),
                    ),
                    if (_storyMedia != null) ...[
                      const SizedBox(height: AppSpacing.md),
                      StoryMediaPreview(media: _storyMedia!),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        storyAspectHint(_storyMedia!.width, _storyMedia!.height),
                        style: TextStyle(
                          color: isStoryAspectRatio(_storyMedia!.width, _storyMedia!.height)
                              ? Theme.of(context).colorScheme.primary
                              : Theme.of(context).colorScheme.error,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: _storyCaptionCtrl,
                      decoration: const InputDecoration(labelText: 'کپشن (اختیاری)'),
                      maxLines: 2,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    PrimaryButton(label: 'انتشار استوری ۲۴ ساعته', loading: _saving, onPressed: _publishStory),
                    const SizedBox(height: AppSpacing.xl),
                    const Text('استوری‌های اخیر', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    const SizedBox(height: AppSpacing.md),
                    ...stories.map(
                      (story) => Card(
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (story.media != null)
                                SizedBox(
                                  width: 72,
                                  child: StoryMediaPreview(media: story.media!, maxWidth: 72, showBadge: false),
                                ),
                              const SizedBox(width: AppSpacing.md),
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
        ],
      ),
    );
  }
}
