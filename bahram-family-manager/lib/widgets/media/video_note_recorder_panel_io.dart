import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/local_media_url.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/core/utils/picked_media.dart';
import 'package:bahram_family_manager/core/utils/read_file_bytes.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class VideoNoteRecordingResult {
  const VideoNoteRecordingResult({
    required this.bytes,
    required this.filename,
    this.localPath,
    this.mimeType = 'video/mp4',
  });

  final Uint8List bytes;
  final String filename;
  final String? localPath;
  final String mimeType;
}

enum _Phase { idle, reviewing }

/// Native/desktop panel: pick a short clip then circular review.
/// Live in-app circular capture is implemented on the web panel (primary local path).
class VideoNoteRecorderPanel extends StatefulWidget {
  const VideoNoteRecorderPanel({
    super.key,
    required this.onRecorded,
    this.onError,
    this.enabled = true,
  });

  final ValueChanged<VideoNoteRecordingResult> onRecorded;
  final ValueChanged<String>? onError;
  final bool enabled;

  @override
  State<VideoNoteRecorderPanel> createState() => _VideoNoteRecorderPanelState();
}

class _VideoNoteRecorderPanelState extends State<VideoNoteRecorderPanel> {
  _Phase _phase = _Phase.idle;
  bool _busy = false;

  Uint8List? _draftBytes;
  String? _draftFilename;
  String? _draftPath;
  String _draftMime = 'video/mp4';
  VideoPlayerController? _reviewPlayer;

  @override
  void dispose() {
    unawaited(_disposeReview());
    super.dispose();
  }

  Future<void> _disposeReview() async {
    await _reviewPlayer?.dispose();
    _reviewPlayer = null;
  }

  Future<void> _pickClip() async {
    if (!widget.enabled || _busy) return;
    setState(() => _busy = true);

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        withData: pickFilesWithData,
      );
      final picked = result?.files.singleOrNull;
      if (picked == null) {
        if (mounted) setState(() => _busy = false);
        return;
      }

      final path = picked.path;
      Uint8List? bytes = picked.bytes;
      if ((bytes == null || bytes.isEmpty) && path != null && path.isNotEmpty) {
        bytes = await readFileBytes(path);
      }
      if (bytes == null || bytes.isEmpty) {
        widget.onError?.call('خواندن ویدیو ممکن نشد.');
        if (mounted) setState(() => _busy = false);
        return;
      }

      final filename = (picked.name.isNotEmpty
              ? picked.name
              : (path != null ? p.basename(path) : ''))
          .trim();
      final safeName = filename.isNotEmpty
          ? filename
          : 'video_note_${DateTime.now().millisecondsSinceEpoch}.mp4';
      final mime = guessMediaMimeType(safeName, 'video');

      await _disposeReview();
      final source = (path != null && path.isNotEmpty) ? path : null;
      late final VideoPlayerController player;
      if (source != null) {
        player = createVideoPlayerController(source, isLocalFile: true);
      } else {
        final url = await createLocalMediaUrl(bytes, mime, extension: p.extension(safeName).replaceFirst('.', ''));
        player = createVideoPlayerController(url, isLocalFile: false);
      }
      await player.initialize();
      await player.setLooping(true);

      if (!mounted) {
        await player.dispose();
        return;
      }

      setState(() {
        _draftBytes = bytes;
        _draftFilename = safeName;
        _draftPath = path;
        _draftMime = mime;
        _reviewPlayer = player;
        _busy = false;
        _phase = _Phase.reviewing;
      });
    } catch (_) {
      if (mounted) setState(() => _busy = false);
      widget.onError?.call('انتخاب ویدیو ممکن نشد.');
    }
  }

  Future<void> _useRecording() async {
    final bytes = _draftBytes;
    final filename = _draftFilename;
    if (bytes == null || filename == null) return;
    widget.onRecorded(
      VideoNoteRecordingResult(
        bytes: bytes,
        filename: filename,
        localPath: _draftPath,
        mimeType: _draftMime,
      ),
    );
    await _reset();
  }

  Future<void> _reset() async {
    await _disposeReview();
    _draftBytes = null;
    _draftFilename = null;
    _draftPath = null;
    if (!mounted) return;
    setState(() {
      _phase = _Phase.idle;
      _busy = false;
    });
  }

  Future<void> _toggleReviewPlay() async {
    final player = _reviewPlayer;
    if (player == null) return;
    if (player.value.isPlaying) {
      await player.pause();
    } else {
      await player.play();
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final reviewing = _phase == _Phase.reviewing;
    final isMobile = Platform.isAndroid || Platform.isIOS;

    return GlassSurface(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Text(
            reviewing ? 'بازبینی پیام ویدیویی' : 'پیام ویدیویی دایره‌ای',
            style: TextStyle(fontWeight: FontWeight.w700, color: scheme.onSurface),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            reviewing
                ? 'اگر راضی هستید استفاده کنید؛ در غیر این صورت دوباره انتخاب کنید.'
                : isMobile
                    ? 'یک کلیپ کوتاه از گالری/دوربین انتخاب کنید (حداکثر حدود ۶۰ ثانیه بهتر است). ضبط زندهٔ دایره‌ای کامل روی نسخه وب مدیر است.'
                    : 'برای ضبط زندهٔ دایره‌ای مثل تلگرام، مدیر را روی وب باز کنید. اینجا می‌توانید فایل ویدیو انتخاب کنید.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.65)),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: 220,
            height: 220,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: scheme.primary.withValues(alpha: 0.45), width: 2),
              ),
              clipBehavior: Clip.antiAlias,
              child: reviewing && _reviewPlayer != null && _reviewPlayer!.value.isInitialized
                  ? GestureDetector(
                      onTap: _toggleReviewPlay,
                      child: FittedBox(
                        fit: BoxFit.cover,
                        clipBehavior: Clip.hardEdge,
                        child: SizedBox(
                          width: _reviewPlayer!.value.size.width,
                          height: _reviewPlayer!.value.size.height,
                          child: VideoPlayer(_reviewPlayer!),
                        ),
                      ),
                    )
                  : ColoredBox(
                      color: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
                      child: Center(
                        child: Icon(
                          Icons.videocam_rounded,
                          size: 48,
                          color: scheme.primary.withValues(alpha: 0.75),
                        ),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (!reviewing)
            FilledButton.icon(
              onPressed: (!widget.enabled || _busy) ? null : _pickClip,
              icon: const Icon(Icons.video_file_rounded),
              label: Text(_busy ? 'در حال آماده‌سازی…' : 'انتخاب کلیپ ویدیو'),
            )
          else
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          await _reset();
                          await _pickClip();
                        },
                  child: const Text('انتخاب دوباره'),
                ),
                const SizedBox(width: AppSpacing.sm),
                FilledButton.icon(
                  onPressed: _busy ? null : _useRecording,
                  icon: const Icon(Icons.check_rounded),
                  label: const Text('استفاده از این ویدیو'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
