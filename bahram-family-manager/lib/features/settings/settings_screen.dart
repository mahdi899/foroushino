import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/features/settings/family_admins_screen.dart';
import 'package:bahram_family_manager/features/debug/debug_tools_panel.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  Future<FamilyBrandingSettings>? _settingsFuture;

  final _displayNameCtrl = TextEditingController();
  final _profileNameCtrl = TextEditingController();

  int? _profileMediaId;
  int? _communityMediaId;
  FamilyMediaRef? _profilePreview;
  FamilyMediaRef? _communityPreview;
  bool _saving = false;
  bool _uploading = false;
  double _uploadProgress = 0;
  var _profileHydrated = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _displayNameCtrl.dispose();
    _profileNameCtrl.dispose();
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

  EdgeInsets _listPadding(BuildContext context) {
    final base = AppBreakpoints.pagePadding(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final extraBottom = AppBreakpoints.isDesktop(context) ? 0.0 : 88 + bottomInset;
    return base.copyWith(bottom: base.bottom + extraBottom);
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('برندینگ')),
      body: FutureBuilder<FamilyBrandingSettings>(
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
      if (mounted) showAppSnackBar(context, '╪¬┘å╪╕█î┘à╪º╪¬ ╪▒╪│╪º┘å┘ç ╪░╪«█î╪▒┘ç ╪┤╪».');
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
          '╪»█î╪│┌⌐ ╪ó┘╛┘ä┘ê╪»: ${widget.initial.uploadDisk} ┬╖ ┌⌐╪¬╪º╪¿╪«╪º┘å┘ç ╪│╪º█î╪¬: ${widget.initial.siteLibraryDisk}',
          style: TextStyle(color: muted, fontSize: 12),
        ),
        const SizedBox(height: AppSpacing.md),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('╪¿┘ç█î┘å┘çΓÇî╪│╪º╪▓█î ╪«┘ê╪»┌⌐╪º╪▒ ╪¬╪╡╪º┘ê█î╪▒ (WebP)'),
          subtitle: const Text('┘é╪¿┘ä ╪º╪▓ ╪░╪«█î╪▒┘ç╪î ╪¬╪╡┘ê█î╪▒ ┘ü╪┤╪▒╪»┘ç ┘ê ╪¿┘ç█î┘å┘ç ┘à█îΓÇî╪┤┘ê╪»'),
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
          title: const Text('┘ç┘à┌»╪º┘àΓÇî╪│╪º╪▓█î ╪¿╪º ┌⌐╪¬╪º╪¿╪«╪º┘å┘ç ╪▒╪│╪º┘å┘ç ╪│╪º█î╪¬'),
          subtitle: const Text('┘ç╪▒ ╪╣┌⌐╪│ ╪ó┘╛┘ä┘ê╪»╪┤╪»┘ç ╪»╪▒ ┘╛┘å┘ä ╪º╪»┘à█î┘å ╪▒╪│╪º┘å┘ç ╪│╪º█î╪¬ ┘ç┘à ╪½╪¿╪¬ ┘à█îΓÇî╪┤┘ê╪»'),
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
          title: const Text('╪ó┘╛┘ä┘ê╪» ╪▒┘ê█î FTP'),
          subtitle: const Text('╪«╪º┘à┘ê╪┤ = ╪░╪«█î╪▒┘ç ┘à╪¡┘ä█î public ╪¿╪▒╪º█î ╪¬┘ê╪│╪╣┘ç'),
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

