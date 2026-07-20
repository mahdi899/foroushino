import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/features/settings/family_admins_screen.dart';
import 'package:bahram_family_manager/features/debug/debug_tools_panel.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/core/utils/story_aspect.dart';
import 'package:bahram_family_manager/widgets/media/story_media_preview.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

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
  var _profileHydrated = false;

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
    _profileHydrated = false;
    final manager = context.read<AppState>().manager;
    setState(() {
      _settingsFuture = manager.getSettings().then((settings) {
        if (mounted && !_profileHydrated) {
          _profileHydrated = true;
          _displayNameCtrl.text = settings.displayName;
          _profileNameCtrl.text = settings.profileName;
        }
        return settings;
      });
      _storiesFuture = manager.listStories();
      _profilePreview = null;
      _communityPreview = null;
      _profileMediaId = null;
      _communityMediaId = null;
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

  EdgeInsets _listPadding(BuildContext context) {
    final base = AppBreakpoints.pagePadding(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final extraBottom = AppBreakpoints.isDesktop(context) ? 0.0 : 88 + bottomInset;
    return base.copyWith(bottom: base.bottom + extraBottom);
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: ManagerAppBar(
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
                return ListView(
                  padding: _listPadding(context),
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
                    const SizedBox(height: AppSpacing.xl),
                    _AvatarSection(
                      title: 'آواتار پروفایل مدیر',
                      previewUrl: resolveMediaUrl(_profilePreview?.cdnUrl ?? settings.profileAvatar),
                      uploadLabel: 'آپلود آواتار مدیر',
                      uploading: _uploading,
                      progress: _uploadProgress,
                      onUpload: () => _pickAvatar(community: false),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    _AvatarSection(
                      title: 'آواتار پروفایل خانواده (حلقه استوری)',
                      previewUrl: resolveMediaUrl(_communityPreview?.cdnUrl ?? settings.communityAvatar),
                      uploadLabel: 'آپلود آواتار خانواده',
                      uploading: _uploading,
                      progress: _uploadProgress,
                      onUpload: () => _pickAvatar(community: true),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    if (settings.mediaPipeline != null) ...[
                      PanelSectionCard(
                        title: 'رسانه و FTP',
                        icon: Icons.cloud_upload_rounded,
                        child: _MediaPipelinePanel(
                          initial: settings.mediaPipeline!,
                          onChanged: _load,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],
                    if (kDebugMode) ...[
                      const DebugToolsPanel(),
                      const SizedBox(height: AppSpacing.xl),
                    ],
                    PrimaryButton(label: 'ذخیره تنظیمات', loading: _saving, onPressed: _saveSettings),
                    if (context.watch<AppState>().user?.canManageFamilyAdmins ?? false) ...[
                      const SizedBox(height: AppSpacing.xl),
                      PanelSectionCard(
                        title: 'مدیران خانواده',
                        icon: Icons.admin_panel_settings_rounded,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'ساخت، معلق‌کردن، ریست رمز و حذف مدیرانی که به اپ مدیریت خانواده دسترسی دارند.',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            OutlinedButton.icon(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(builder: (_) => const FamilyAdminsScreen()),
                                );
                              },
                              icon: const Icon(Icons.group_rounded),
                              label: const Text('مدیریت مدیران'),
                            ),
                          ],
                        ),
                      ),
                    ],
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
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65),
                              fontSize: 13,
                            ),
                          ),
                          if (_storyMedia != null) ...[
                            const SizedBox(height: AppSpacing.md),
                            Center(child: StoryMediaPreview(media: _storyMedia!)),
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
                      Text(
                        'استوری فعالی نیست.',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
                      )
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

class _AvatarSection extends StatelessWidget {
  const _AvatarSection({
    required this.title,
    required this.previewUrl,
    required this.uploadLabel,
    required this.uploading,
    required this.progress,
    required this.onUpload,
  });

  final String title;
  final String? previewUrl;
  final String uploadLabel;
  final bool uploading;
  final double progress;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    return PanelSectionCard(
      title: title,
      icon: Icons.account_circle_rounded,
      child: Column(
        children: [
          _AvatarPreview(url: previewUrl),
          const SizedBox(height: AppSpacing.md),
          UploadZone(
            label: uploadLabel,
            uploading: uploading,
            progress: progress,
            onTap: onUpload,
          ),
        ],
      ),
    );
  }
}

class _AvatarPreview extends StatelessWidget {
  const _AvatarPreview({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final size = AppBreakpoints.isDesktop(context) ? 112.0 : 128.0;

    return Center(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: scheme.primary.withValues(alpha: 0.35), width: 3),
          boxShadow: AppShadows.primaryGlow,
        ),
        child: ClipOval(
          child: url == null || url!.isEmpty
              ? ColoredBox(
                  color: scheme.surfaceContainerHighest,
                  child: Icon(Icons.person_rounded, size: size * 0.45, color: scheme.onSurface.withValues(alpha: 0.35)),
                )
              : Image.network(
                  url!,
                  fit: BoxFit.cover,
                  width: size,
                  height: size,
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return const Center(child: CircularProgressIndicator(strokeWidth: 2));
                  },
                  errorBuilder: (_, __, ___) => ColoredBox(
                    color: scheme.surfaceContainerHighest,
                    child: Icon(Icons.broken_image_rounded, size: 40, color: scheme.onSurface.withValues(alpha: 0.4)),
                  ),
                ),
        ),
      ),
    );
  }
}

class _MediaPipelinePanel extends StatefulWidget {
  const _MediaPipelinePanel({required this.initial, required this.onChanged});

  final FamilyMediaPipelineSettings initial;
  final VoidCallback onChanged;

  @override
  State<_MediaPipelinePanel> createState() => _MediaPipelinePanelState();
}

class _MediaPipelinePanelState extends State<_MediaPipelinePanel> {
  late bool _optimize;
  late bool _sync;
  late bool _ftp;
  var _saving = false;

  @override
  void initState() {
    super.initState();
    _optimize = widget.initial.optimizeImages;
    _sync = widget.initial.syncToSiteLibrary;
    _ftp = widget.initial.ftpUploadEnabled;
  }

  Future<void> _save(bool Function() readValue, String key, bool value) async {
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.updateMediaPipeline({key: value});
      widget.onChanged();
      if (mounted) showAppSnackBar(context, 'تنظیمات رسانه ذخیره شد.');
    } catch (e) {
      if (mounted) {
        setState(() => readValue());
        showAppSnackBar(context, messageOf(e));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'دیسک آپلود: ${widget.initial.uploadDisk} · کتابخانه سایت: ${widget.initial.siteLibraryDisk}',
          style: TextStyle(color: muted, fontSize: 12),
        ),
        const SizedBox(height: AppSpacing.md),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('بهینه‌سازی خودکار تصاویر (WebP)'),
          subtitle: const Text('قبل از ذخیره، تصویر فشرده و بهینه می‌شود'),
          value: _optimize,
          onChanged: _saving
              ? null
              : (v) {
                  setState(() => _optimize = v);
                  _save(() => _optimize = widget.initial.optimizeImages, 'optimize_images', v);
                },
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('همگام‌سازی با کتابخانه رسانه سایت'),
          subtitle: const Text('هر عکس آپلودشده در پنل ادمین رسانه سایت هم ثبت می‌شود'),
          value: _sync,
          onChanged: _saving
              ? null
              : (v) {
                  setState(() => _sync = v);
                  _save(() => _sync = widget.initial.syncToSiteLibrary, 'sync_to_site_library', v);
                },
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('آپلود روی FTP'),
          subtitle: const Text('خاموش = ذخیره محلی public برای توسعه'),
          value: _ftp,
          onChanged: _saving
              ? null
              : (v) {
                  setState(() => _ftp = v);
                  _save(() => _ftp = widget.initial.ftpUploadEnabled, 'ftp_upload_enabled', v);
                },
        ),
      ],
    );
  }
}
