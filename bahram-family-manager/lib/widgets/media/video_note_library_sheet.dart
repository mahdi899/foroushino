import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/core/utils/media_size_guard.dart';
import 'package:bahram_family_manager/core/utils/picked_media.dart';
import 'package:bahram_family_manager/services/video_note_local_store.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/media/video_note_recorder_panel.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_dialog.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

/// Bottom sheet listing locally saved circular video notes.
class VideoNoteLibrarySheet extends StatefulWidget {
  const VideoNoteLibrarySheet({super.key});

  @override
  State<VideoNoteLibrarySheet> createState() => _VideoNoteLibrarySheetState();
}

class _VideoNoteLibrarySheetState extends State<VideoNoteLibrarySheet> {
  List<SavedVideoNoteRecording> _recordings = [];
  bool _loading = true;
  bool _importing = false;
  String? _playingPath;
  VideoPlayerController? _player;

  @override
  void initState() {
    super.initState();
    unawaited(_reload());
  }

  @override
  void dispose() {
    unawaited(_disposePlayer());
    super.dispose();
  }

  Future<void> _disposePlayer() async {
    final player = _player;
    _player = null;
    _playingPath = null;
    await player?.dispose();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    final list = await VideoNoteLocalStore.listAll();
    if (!mounted) return;
    setState(() {
      _recordings = list;
      _loading = false;
    });
  }

  Future<void> _togglePlay(SavedVideoNoteRecording recording) async {
    if (_playingPath == recording.absolutePath) {
      final player = _player;
      if (player != null && player.value.isInitialized) {
        if (player.value.isPlaying) {
          await player.pause();
        } else {
          await player.play();
        }
        if (mounted) setState(() {});
      }
      return;
    }

    await _disposePlayer();
    try {
      final player = createVideoPlayerController(
        recording.absolutePath,
        isLocalFile: !kIsWeb,
      );
      await player.initialize();
      await player.setLooping(true);
      player.addListener(() {
        if (!mounted) return;
        if (player.value.isPlaying != true && _playingPath == recording.absolutePath) {
          setState(() {});
        } else if (mounted) {
          setState(() {});
        }
      });
      if (!mounted) {
        await player.dispose();
        return;
      }
      setState(() {
        _player = player;
        _playingPath = recording.absolutePath;
      });
      await player.play();
    } catch (_) {
      if (mounted) showAppSnackBar(context, 'پخش ویدیو ممکن نشد.');
    }
  }

  Future<void> _select(SavedVideoNoteRecording recording) async {
    await _disposePlayer();
    final bytes = await VideoNoteLocalStore.readBytes(recording);
    if (bytes == null || bytes.isEmpty) {
      if (mounted) showAppSnackBar(context, 'خواندن فایل ویدیو ناموفق بود.');
      return;
    }
    final oversize = MediaSizeGuard.oversizeMessage(bytes.length, type: 'video');
    if (oversize != null) {
      if (mounted) showAppSnackBar(context, oversize);
      return;
    }
    if (!mounted) return;
    Navigator.of(context).pop(
      VideoNoteRecordingResult(
        bytes: bytes,
        filename: recording.filename,
        localPath: recording.absolutePath,
      ),
    );
  }

  Future<void> _rename(SavedVideoNoteRecording recording) async {
    final stem = recording.filename.contains('.')
        ? recording.filename.substring(0, recording.filename.lastIndexOf('.'))
        : recording.filename;
    // Keep draft in a local so we never dispose a TextEditingController while the
    // dialog route is still animating closed (showDialog completes before dispose).
    var draft = stem;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'تغییر نام ویدیو دایره‌ای',
      content: _VideoNoteRenameField(
        initialText: stem,
        onChanged: (value) => draft = value,
        onSubmitted: () => Navigator.pop(context, true),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('ذخیره')),
      ],
    );
    final nextName = draft.trim();
    if (confirmed != true || nextName.isEmpty) return;

    if (_playingPath == recording.absolutePath) {
      await _disposePlayer();
    }

    final renamed = await VideoNoteLocalStore.rename(recording, nextName);
    if (!mounted) return;
    if (renamed == null) {
      showAppSnackBar(context, 'تغییر نام ویدیو ناموفق بود.');
      return;
    }
    await _reload();
    if (mounted) showAppSnackBar(context, 'نام ویدیو به‌روز شد.');
  }

  Future<void> _delete(SavedVideoNoteRecording recording) async {
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'حذف از کتابخانه',
      content: Text('«${recording.filename}» از حافظه دستگاه حذف می‌شود.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          style: TextButton.styleFrom(foregroundColor: AppColors.error),
          child: const Text('حذف'),
        ),
      ],
    );
    if (confirmed != true) return;

    if (_playingPath == recording.absolutePath) {
      await _disposePlayer();
    }

    final ok = await VideoNoteLocalStore.delete(recording);
    if (!mounted) return;
    if (!ok) {
      showAppSnackBar(context, 'حذف ویدیو ناموفق بود.');
      return;
    }
    await _reload();
  }

  Future<void> _importFromDevice() async {
    if (_importing || kIsWeb) return;
    setState(() => _importing = true);

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        withData: pickFilesWithData,
      );
      final picked = result?.files.singleOrNull;
      if (picked == null) return;

      final resolved = await resolvePlatformFile(picked, mediaType: 'video');
      if (!mounted) return;
      if (resolved is ResolvePickedMediaError) {
        showAppSnackBar(context, resolved.message);
        return;
      }
      final file = (resolved as ResolvePickedMediaOk).file;

      SavedVideoNoteRecording? saved;
      if (file.path != null && file.path!.isNotEmpty) {
        saved = await VideoNoteLocalStore.saveFromPath(file.path!, filename: file.filename);
      } else if (file.bytes != null && file.bytes!.isNotEmpty) {
        saved = await VideoNoteLocalStore.save(file.bytes!, file.filename);
      }

      if (saved == null) {
        if (mounted) showAppSnackBar(context, 'ذخیره در کتابخانه ناموفق بود.');
        return;
      }

      await _reload();
      if (!mounted) return;
      showAppSnackBar(context, 'ویدیو به کتابخانه اضافه شد.');
      await _select(saved);
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final muted = context.appTextMuted;

    if (kIsWeb) {
      return Text(
        'کتابخانه ویدیو دایره‌ای روی وب در دسترس نیست — از ضبط مستقیم استفاده کنید.',
        style: TextStyle(color: muted),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PrimaryButton(
          label: 'افزودن از فایل دستگاه',
          icon: Icons.video_file_outlined,
          loading: _importing,
          onPressed: _importing ? null : () => unawaited(_importFromDevice()),
        ),
        const SizedBox(height: AppSpacing.md),
        if (_loading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(AppSpacing.xl),
              child: CircularProgressIndicator(),
            ),
          )
        else if (_recordings.isEmpty)
          GlassPanel(
            borderRadius: AppRadius.card,
            blur: 0,
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                Icon(Icons.radio_button_checked_rounded, size: 40, color: muted),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'هنوز ویدیو دایره‌ای ذخیره نشده',
                  style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'با ضبط ویدیو دایره‌ای یا افزودن از فایل، اینجا نمایش داده می‌شود.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: muted, fontSize: 13),
                ),
              ],
            ),
          )
        else
          ..._recordings.map((recording) {
            final playing = _playingPath == recording.absolutePath &&
                (_player?.value.isPlaying ?? false);
            final subtitle =
                '${formatJalaliDateTime(recording.savedAt.toUtc().toIso8601String())} · ${formatBytes(recording.sizeBytes)}';

            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: GlassPanel(
                borderRadius: AppRadius.tile,
                blur: 0,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                  leading: CircleAvatar(
                    backgroundColor: context.appPrimarySoft,
                    child: Icon(Icons.radio_button_checked_rounded, color: scheme.primary, size: 20),
                  ),
                  title: Text(
                    recording.filename,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface),
                  ),
                  subtitle: Text(subtitle, style: TextStyle(color: muted, fontSize: 12)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: playing ? 'توقف' : 'پخش',
                        onPressed: () => unawaited(_togglePlay(recording)),
                        icon: Icon(
                          playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                          color: scheme.primary,
                        ),
                      ),
                      IconButton(
                        tooltip: 'تغییر نام',
                        onPressed: () => unawaited(_rename(recording)),
                        icon: Icon(Icons.drive_file_rename_outline_rounded, color: scheme.primary),
                      ),
                      IconButton(
                        tooltip: 'حذف',
                        onPressed: () => unawaited(_delete(recording)),
                        icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
                      ),
                    ],
                  ),
                  onTap: () => unawaited(_select(recording)),
                ),
              ),
            );
          }),
      ],
    );
  }
}

Future<VideoNoteRecordingResult?> showVideoNoteLibrarySheet(BuildContext context) {
  return showAppBottomSheet<VideoNoteRecordingResult>(
    context: context,
    title: 'کتابخانه ویدیو دایره‌ای',
    subtitle: 'ویدیوهای ذخیره‌شده روی دستگاه — انتخاب برای پست',
    scrollable: true,
    initialChildSize: 0.72,
    child: const VideoNoteLibrarySheet(),
  );
}

/// Owns [TextEditingController] for the rename dialog so dispose runs only when
/// the dialog route is removed after its close animation — not right after pop.
class _VideoNoteRenameField extends StatefulWidget {
  const _VideoNoteRenameField({
    required this.initialText,
    required this.onChanged,
    required this.onSubmitted,
  });

  final String initialText;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmitted;

  @override
  State<_VideoNoteRenameField> createState() => _VideoNoteRenameFieldState();
}

class _VideoNoteRenameFieldState extends State<_VideoNoteRenameField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialText);
    _controller.addListener(_emitChanged);
  }

  void _emitChanged() => widget.onChanged(_controller.text);

  @override
  void dispose() {
    _controller.removeListener(_emitChanged);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      autofocus: true,
      textInputAction: TextInputAction.done,
      decoration: const InputDecoration(
        labelText: 'نام جدید',
        hintText: 'مثلاً پیام صبحگاهی',
      ),
      onSubmitted: (_) => widget.onSubmitted(),
    );
  }
}
