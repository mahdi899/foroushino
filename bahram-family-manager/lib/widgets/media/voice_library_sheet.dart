import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/core/utils/media_size_guard.dart';
import 'package:bahram_family_manager/services/voice_local_store.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/media/voice_recorder_panel.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_dialog.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

/// Bottom sheet listing locally saved voice recordings.
class VoiceLibrarySheet extends StatefulWidget {
  const VoiceLibrarySheet({super.key});

  @override
  State<VoiceLibrarySheet> createState() => _VoiceLibrarySheetState();
}

class _VoiceLibrarySheetState extends State<VoiceLibrarySheet> {
  final _player = AudioPlayer();
  List<SavedVoiceRecording> _recordings = [];
  bool _loading = true;
  bool _importing = false;
  String? _playingPath;
  bool _playerPlaying = false;

  StreamSubscription<PlayerState>? _stateSub;

  @override
  void initState() {
    super.initState();
    _stateSub = _player.playerStateStream.listen((state) {
      if (!mounted) return;
      setState(() => _playerPlaying = state.playing);
      if (state.processingState == ProcessingState.completed) {
        setState(() => _playingPath = null);
      }
    });
    unawaited(_reload());
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _player.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() => _loading = true);
    final list = await VoiceLocalStore.listAll();
    if (!mounted) return;
    setState(() {
      _recordings = list;
      _loading = false;
    });
  }

  Future<void> _togglePlay(SavedVoiceRecording recording) async {
    if (_playingPath == recording.absolutePath && _playerPlaying) {
      await _player.pause();
      return;
    }

    try {
      await _player.stop();
      await setAudioPlayerSource(
        _player,
        recording.absolutePath,
        isLocalFile: !kIsWeb,
      );
      setState(() => _playingPath = recording.absolutePath);
      await _player.play();
    } catch (_) {
      if (mounted) showAppSnackBar(context, 'پخش ویس ممکن نشد.');
    }
  }

  Future<void> _select(SavedVoiceRecording recording) async {
    await _player.stop();
    final bytes = await VoiceLocalStore.readBytes(recording);
    if (bytes == null || bytes.isEmpty) {
      if (mounted) showAppSnackBar(context, 'خواندن فایل ویس ناموفق بود.');
      return;
    }
    final oversize = MediaSizeGuard.oversizeMessage(bytes.length);
    if (oversize != null) {
      if (mounted) showAppSnackBar(context, oversize);
      return;
    }
    if (!mounted) return;
    Navigator.of(context).pop(
      VoiceRecordingResult(
        bytes: bytes,
        filename: recording.filename,
        localPath: recording.absolutePath,
      ),
    );
  }

  Future<void> _rename(SavedVoiceRecording recording) async {
    final stem = recording.filename.contains('.')
        ? recording.filename.substring(0, recording.filename.lastIndexOf('.'))
        : recording.filename;
    final ctrl = TextEditingController(text: stem);
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'تغییر نام ویس',
      content: TextField(
        controller: ctrl,
        autofocus: true,
        textInputAction: TextInputAction.done,
        decoration: const InputDecoration(
          labelText: 'نام جدید',
          hintText: 'مثلاً معرفی خانواده',
        ),
        onSubmitted: (_) => Navigator.pop(context, true),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('ذخیره')),
      ],
    );
    final nextName = ctrl.text.trim();
    ctrl.dispose();
    if (confirmed != true || nextName.isEmpty) return;

    if (_playingPath == recording.absolutePath) {
      await _player.stop();
      _playingPath = null;
    }

    final renamed = await VoiceLocalStore.rename(recording, nextName);
    if (!mounted) return;
    if (renamed == null) {
      showAppSnackBar(context, 'تغییر نام ویس ناموفق بود.');
      return;
    }
    await _reload();
    if (mounted) showAppSnackBar(context, 'نام ویس به‌روز شد.');
  }

  Future<void> _delete(SavedVoiceRecording recording) async {
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
      await _player.stop();
      _playingPath = null;
    }

    final ok = await VoiceLocalStore.delete(recording);
    if (!mounted) return;
    if (!ok) {
      showAppSnackBar(context, 'حذف ویس ناموفق بود.');
      return;
    }
    await _reload();
  }

  Future<void> _importFromDevice() async {
    if (_importing || kIsWeb) return;
    setState(() => _importing = true);

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
        withData: true,
      );
      final picked = result?.files.singleOrNull;
      if (picked == null) return;

      final size = picked.size;
      if (size > 0 && MediaSizeGuard.isOversize(size)) {
        if (mounted) {
          showAppSnackBar(
            context,
            MediaSizeGuard.oversizeMessage(size) ?? 'فایل بیش از حد بزرگ است.',
          );
        }
        return;
      }

      final bytes = picked.bytes;
      if (bytes == null) {
        if (mounted) showAppSnackBar(context, 'خواندن فایل «${picked.name}» ناموفق بود.');
        return;
      }

      final oversize = MediaSizeGuard.oversizeMessage(bytes.length);
      if (oversize != null) {
        if (mounted) showAppSnackBar(context, oversize);
        return;
      }

      final saved = await VoiceLocalStore.save(bytes, picked.name);
      if (saved == null) {
        if (mounted) showAppSnackBar(context, 'ذخیره در کتابخانه ناموفق بود.');
        return;
      }

      await _reload();
      if (!mounted) return;
      showAppSnackBar(context, 'ویس به کتابخانه اضافه شد.');
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
        'کتابخانه ویس روی وب در دسترس نیست — از ضبط مستقیم استفاده کنید.',
        style: TextStyle(color: muted),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PrimaryButton(
          label: 'افزودن از فایل دستگاه',
          icon: Icons.audio_file_outlined,
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
                Icon(Icons.mic_none_rounded, size: 40, color: muted),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'هنوز ویسی ذخیره نشده',
                  style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'با ضبط ویس یا افزودن از فایل، اینجا نمایش داده می‌شود.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: muted, fontSize: 13),
                ),
              ],
            ),
          )
        else
          ..._recordings.map((recording) {
            final playing = _playingPath == recording.absolutePath && _playerPlaying;
            final subtitle = '${formatJalaliDateTime(recording.savedAt.toUtc().toIso8601String())} · ${formatBytes(recording.sizeBytes)}';

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
                    child: Icon(Icons.graphic_eq_rounded, color: scheme.primary, size: 20),
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

Future<VoiceRecordingResult?> showVoiceLibrarySheet(BuildContext context) {
  return showAppBottomSheet<VoiceRecordingResult>(
    context: context,
    title: 'کتابخانه ویس',
    subtitle: 'ویس‌های ذخیره‌شده روی دستگاه — انتخاب برای پست',
    scrollable: true,
    initialChildSize: 0.72,
    child: const VoiceLibrarySheet(),
  );
}
