import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:permission_handler/permission_handler.dart';
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/local_media_url.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/core/utils/picked_media.dart';
import 'package:bahram_family_manager/core/utils/read_file_bytes.dart';
import 'package:bahram_family_manager/services/video_note_local_store.dart';
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

enum _Phase { idle, preview, recording, reviewing }

/// Native Telegram-style circular video note: live camera record + optional file pick.
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

class _VideoNoteRecorderPanelState extends State<VideoNoteRecorderPanel>
    with SingleTickerProviderStateMixin {
  static const _maxDuration = Duration(seconds: 60);
  static const _minDuration = Duration(milliseconds: 800);

  late final AnimationController _pulse;

  _Phase _phase = _Phase.idle;
  bool _busy = false;
  bool _cameraSupported = true;
  String? _inlineError;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;
  DateTime? _startedAt;

  CameraController? _camera;
  List<CameraDescription> _cameras = const [];
  int _cameraIndex = 0;

  Uint8List? _draftBytes;
  String? _draftFilename;
  String? _draftPath;
  String _draftMime = 'video/mp4';
  VideoPlayerController? _reviewPlayer;

  bool get _isMobile => Platform.isAndroid || Platform.isIOS;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    if (_isMobile) {
      unawaited(_probeCameras());
    } else {
      _cameraSupported = false;
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _pulse.dispose();
    unawaited(_disposeCamera());
    unawaited(_disposeReview());
    super.dispose();
  }

  Future<void> _probeCameras() async {
    try {
      final cams = await availableCameras();
      if (!mounted) return;
      setState(() {
        _cameras = cams;
        _cameraSupported = cams.isNotEmpty;
        if (cams.isNotEmpty) {
          final front = cams.indexWhere((c) => c.lensDirection == CameraLensDirection.front);
          _cameraIndex = front >= 0 ? front : 0;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _cameraSupported = false);
    }
  }

  Future<void> _disposeCamera() async {
    final cam = _camera;
    _camera = null;
    if (cam == null) return;
    try {
      if (cam.value.isRecordingVideo) {
        await cam.stopVideoRecording();
      }
    } catch (_) {}
    await cam.dispose();
  }

  Future<void> _disposeReview() async {
    await _reviewPlayer?.dispose();
    _reviewPlayer = null;
  }

  void _reportError(String message) {
    if (!mounted) {
      widget.onError?.call(message);
      return;
    }
    setState(() => _inlineError = message);
    widget.onError?.call(message);
  }

  /// Theme uses [Size.fromHeight] (infinite width) — unsafe inside [Row].
  ButtonStyle _rowFilledStyle({Color? backgroundColor}) {
    return FilledButton.styleFrom(
      backgroundColor: backgroundColor,
      minimumSize: const Size(0, 48),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Future<bool> _ensurePermissions() async {
    try {
      final cam = await Permission.camera.request();
      final mic = await Permission.microphone.request();
      if (!cam.isGranted || !mic.isGranted) {
        _reportError(
          'دسترسی دوربین و میکروفون لازم است. از تنظیمات گوشی فعال کنید.',
        );
        return false;
      }
      return true;
    } catch (_) {
      _reportError('بررسی مجوز دوربین/میکروفون ناموفق بود.');
      return false;
    }
  }

  Future<bool> _openCamera({int? index}) async {
    if (_cameras.isEmpty) {
      await _probeCameras();
    }
    if (_cameras.isEmpty) {
      _reportError('دوربینی روی این دستگاه پیدا نشد.');
      return false;
    }

    final nextIndex = (index ?? _cameraIndex).clamp(0, _cameras.length - 1);
    await _disposeCamera();

    final controller = CameraController(
      _cameras[nextIndex],
      ResolutionPreset.medium,
      enableAudio: true,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    try {
      await controller.initialize();
      // Prefer a more square-ish framing when the device allows it.
      try {
        await controller.lockCaptureOrientation();
      } catch (_) {}
      if (!mounted) {
        await controller.dispose();
        return false;
      }
      setState(() {
        _camera = controller;
        _cameraIndex = nextIndex;
        _inlineError = null;
      });
      return true;
    } catch (_) {
      await controller.dispose();
      _reportError('راه‌اندازی دوربین ممکن نشد. دوباره تلاش کنید.');
      return false;
    }
  }

  Future<void> _openPreview() async {
    if (!widget.enabled || _busy || _phase != _Phase.idle) return;
    if (!_cameraSupported) {
      _reportError('ضبط زنده روی این پلتفرم پشتیبانی نمی‌شود. فایل ویدیو انتخاب کنید.');
      return;
    }

    setState(() {
      _busy = true;
      _inlineError = null;
    });
    final permitted = await _ensurePermissions();
    if (!permitted) {
      if (mounted) setState(() => _busy = false);
      return;
    }
    final ok = await _openCamera();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _phase = ok ? _Phase.preview : _Phase.idle;
    });
  }

  Future<void> _flipCamera() async {
    if (_busy || _cameras.length < 2) return;
    if (_phase != _Phase.preview) return;
    setState(() => _busy = true);
    final next = (_cameraIndex + 1) % _cameras.length;
    final ok = await _openCamera(index: next);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (!ok) _phase = _Phase.idle;
    });
  }

  Future<void> _startRecording() async {
    if (!widget.enabled || _busy) return;
    if (_phase == _Phase.idle) {
      await _openPreview();
      if (_phase != _Phase.preview) return;
    }
    final cam = _camera;
    if (_phase != _Phase.preview || cam == null || !cam.value.isInitialized) {
      _reportError('دوربین آماده نیست. دوباره شروع کنید.');
      return;
    }
    if (cam.value.isRecordingVideo) return;

    setState(() {
      _busy = true;
      _inlineError = null;
    });
    try {
      await cam.startVideoRecording();
      _startedAt = DateTime.now();
      _elapsed = Duration.zero;
      _ticker?.cancel();
      _ticker = Timer.periodic(const Duration(milliseconds: 100), (_) {
        final start = _startedAt;
        if (start == null || !mounted) return;
        final next = DateTime.now().difference(start);
        setState(() => _elapsed = next);
        if (next >= _maxDuration) {
          unawaited(_finishRecording(cancel: false));
        }
      });
      _pulse.repeat(reverse: true);
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.recording;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
        });
      }
      _reportError('شروع ضبط ویدیو ممکن نشد. دوباره تلاش کنید.');
    }
  }

  Future<void> _finishRecording({required bool cancel}) async {
    if (_phase != _Phase.recording || _busy) return;
    setState(() {
      _busy = true;
      if (!cancel) _inlineError = null;
    });
    _ticker?.cancel();
    _pulse.stop();
    _pulse.reset();

    final cam = _camera;
    final started = _startedAt;
    _startedAt = null;
    XFile? file;

    try {
      if (cam != null && cam.value.isRecordingVideo) {
        file = await cam.stopVideoRecording();
      }
    } catch (_) {
      file = null;
      if (!cancel) {
        if (mounted) {
          setState(() {
            _busy = false;
            _phase = _Phase.preview;
            _elapsed = Duration.zero;
          });
        }
        _reportError('توقف ضبط ناموفق بود. دوباره تلاش کنید.');
        return;
      }
    }

    final duration = started == null ? Duration.zero : DateTime.now().difference(started);

    if (cancel) {
      if (file != null) {
        try {
          await File(file.path).delete();
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
          _elapsed = Duration.zero;
        });
      }
      return;
    }

    if (file == null || duration < _minDuration) {
      if (file != null) {
        try {
          await File(file.path).delete();
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
          _elapsed = Duration.zero;
        });
      }
      _reportError('ویدیو خیلی کوتاه بود. دوباره ضبط کنید.');
      return;
    }

    try {
      final path = file.path;
      final bytes = await readFileBytes(path);
      if (bytes.isEmpty) {
        throw StateError('empty');
      }
      final filename = 'video_note_${DateTime.now().millisecondsSinceEpoch}.mp4';
      await _enterReview(bytes: bytes, filename: filename, path: path, mime: 'video/mp4');
      await _disposeCamera();
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.reviewing;
          _elapsed = Duration.zero;
          _inlineError = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
          _elapsed = Duration.zero;
        });
      }
      _reportError('ذخیره ویدیو ممکن نشد.');
    }
  }

  Future<void> _enterReview({
    required Uint8List bytes,
    required String filename,
    String? path,
    required String mime,
  }) async {
    await _disposeReview();
    VideoPlayerController? player;
    try {
      if (path != null && path.isNotEmpty) {
        player = createVideoPlayerController(path, isLocalFile: true);
      } else {
        final url = await createLocalMediaUrl(
          bytes,
          mime,
          extension: p.extension(filename).replaceFirst('.', ''),
        );
        // On IO, [createLocalMediaUrl] returns a temp file path — not a network URL.
        player = createVideoPlayerController(url, isLocalFile: true);
      }
      await player.initialize();
      await player.setLooping(true);
    } catch (_) {
      await player?.dispose();
      throw StateError('review_init_failed');
    }
    if (!mounted) {
      await player.dispose();
      return;
    }
    _draftBytes = bytes;
    _draftFilename = filename;
    _draftPath = path;
    _draftMime = mime;
    _reviewPlayer = player;
  }

  Future<void> _pickClip() async {
    if (!widget.enabled || _busy) return;
    setState(() {
      _busy = true;
      _inlineError = null;
    });

    try {
      if (_phase == _Phase.recording) {
        await _finishRecording(cancel: true);
      }
      await _disposeCamera();

      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        withData: pickFilesWithData,
      );
      final picked = result?.files.singleOrNull;
      if (picked == null) {
        if (mounted) {
          setState(() {
            _busy = false;
            _phase = _Phase.idle;
          });
        }
        return;
      }

      final path = picked.path;
      Uint8List? bytes = picked.bytes;
      if ((bytes == null || bytes.isEmpty) && path != null && path.isNotEmpty) {
        bytes = await readFileBytes(path);
      }
      if (bytes == null || bytes.isEmpty) {
        _reportError('خواندن ویدیو ممکن نشد.');
        if (mounted) {
          setState(() {
            _busy = false;
            _phase = _Phase.idle;
          });
        }
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
      if (!mime.startsWith('video/')) {
        _reportError('فایل انتخاب‌شده ویدیو نیست.');
        if (mounted) {
          setState(() {
            _busy = false;
            _phase = _Phase.idle;
          });
        }
        return;
      }

      await _enterReview(bytes: bytes, filename: safeName, path: path, mime: mime);
      if (!mounted) return;
      setState(() {
        _busy = false;
        _phase = _Phase.reviewing;
        _inlineError = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.idle;
        });
      }
      _reportError('انتخاب یا پیش‌نمایش ویدیو ممکن نشد.');
    }
  }

  Future<void> _useRecording() async {
    final bytes = _draftBytes;
    final filename = _draftFilename;
    if (bytes == null || filename == null) {
      _reportError('ویدیویی برای استفاده آماده نیست.');
      return;
    }

    SavedVideoNoteRecording? saved;
    try {
      final path = _draftPath;
      if (path != null && path.isNotEmpty) {
        saved = await VideoNoteLocalStore.saveFromPath(path, filename: filename);
      }
      saved ??= await VideoNoteLocalStore.save(bytes, filename);
    } catch (_) {
      _reportError('ذخیره ویدیو روی دستگاه ناموفق بود.');
      return;
    }

    widget.onRecorded(
      VideoNoteRecordingResult(
        bytes: bytes,
        filename: saved?.filename ?? filename,
        localPath: saved?.absolutePath ?? _draftPath,
        mimeType: _draftMime,
      ),
    );
    await _reset();
  }

  Future<void> _reset({bool reopenPreview = false}) async {
    _ticker?.cancel();
    _pulse.stop();
    _pulse.reset();
    await _disposeReview();
    await _disposeCamera();
    _draftBytes = null;
    _draftFilename = null;
    _draftPath = null;
    _elapsed = Duration.zero;
    _startedAt = null;
    if (!mounted) return;
    setState(() {
      _phase = _Phase.idle;
      _busy = false;
      _inlineError = null;
    });
    if (reopenPreview) {
      await _openPreview();
    }
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

  String get _hint {
    switch (_phase) {
      case _Phase.idle:
        return _cameraSupported
            ? 'مثل تلگرام ضبط کنید (حداکثر ۶۰ ثانیه) یا از فایل انتخاب کنید.'
            : 'ضبط زنده روی این دستگاه در دسترس نیست؛ فایل ویدیو انتخاب کنید.';
      case _Phase.preview:
        return 'آماده ضبط — دکمه قرمز را بزنید.';
      case _Phase.recording:
        return 'در حال ضبط… برای پایان دوباره بزنید.';
      case _Phase.reviewing:
        return 'اگر راضی هستید استفاده کنید؛ در غیر این صورت دوباره ضبط کنید.';
    }
  }

  Widget _buildCirclePreview(ColorScheme scheme) {
    final cam = _camera;
    final reviewing = _phase == _Phase.reviewing;
    final live = (_phase == _Phase.preview || _phase == _Phase.recording) &&
        cam != null &&
        cam.value.isInitialized;

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final recording = _phase == _Phase.recording;
        final borderColor = recording
            ? Color.lerp(AppColors.error, scheme.primary, _pulse.value) ?? AppColors.error
            : scheme.primary.withValues(alpha: 0.45);
        return Container(
          width: 240,
          height: 240,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: borderColor, width: recording ? 4 : 2),
            boxShadow: recording
                ? [
                    BoxShadow(
                      color: AppColors.error.withValues(alpha: 0.25 + (_pulse.value * 0.2)),
                      blurRadius: 16,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          clipBehavior: Clip.antiAlias,
          child: child,
        );
      },
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
          : live
              ? FittedBox(
                  fit: BoxFit.cover,
                  clipBehavior: Clip.hardEdge,
                  child: SizedBox(
                    width: cam.value.previewSize?.height ?? 240,
                    height: cam.value.previewSize?.width ?? 240,
                    child: CameraPreview(cam),
                  ),
                )
              : ColoredBox(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
                  child: Center(
                    child: _busy
                        ? const CircularProgressIndicator(strokeWidth: 2)
                        : Icon(
                            Icons.videocam_rounded,
                            size: 48,
                            color: scheme.primary.withValues(alpha: 0.75),
                          ),
                  ),
                ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final reviewing = _phase == _Phase.reviewing;
    final recording = _phase == _Phase.recording;
    final preview = _phase == _Phase.preview;

    return GlassPanel(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Text(
            reviewing ? 'بازبینی پیام ویدیویی' : 'پیام ویدیویی دایره‌ای',
            style: TextStyle(fontWeight: FontWeight.w700, color: scheme.onSurface),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _hint,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.65)),
          ),
          if (_inlineError != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              _inlineError!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          _buildCirclePreview(scheme),
          if (recording || preview) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              recording
                  ? toFaDigits(
                      '${_elapsed.inMinutes.toString().padLeft(2, '0')}:'
                      '${(_elapsed.inSeconds % 60).toString().padLeft(2, '0')}'
                      ' / 01:00',
                    )
                  : '۰۰:۰۰ / ۰۱:۰۰',
              style: TextStyle(
                fontFeatures: const [FontFeature.tabularFigures()],
                fontWeight: FontWeight.w700,
                color: recording ? AppColors.error : scheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          if (_phase == _Phase.idle) ...[
            if (_cameraSupported)
              FilledButton.icon(
                onPressed: (!widget.enabled || _busy) ? null : _openPreview,
                icon: const Icon(Icons.fiber_manual_record_rounded),
                label: Text(_busy ? 'در حال آماده‌سازی…' : 'شروع ضبط (دوربین)'),
              ),
            if (_cameraSupported) const SizedBox(height: AppSpacing.sm),
            TextButton.icon(
              onPressed: (!widget.enabled || _busy) ? null : _pickClip,
              icon: const Icon(Icons.video_file_rounded),
              label: const Text('انتخاب از فایل'),
            ),
          ] else if (preview) ...[
            Row(
              children: [
                if (_cameras.length > 1)
                  IconButton(
                    tooltip: 'تعویض دوربین',
                    onPressed: _busy ? null : _flipCamera,
                    icon: const Icon(Icons.cameraswitch_rounded),
                  ),
                Expanded(
                  child: FilledButton.icon(
                    style: _rowFilledStyle(backgroundColor: AppColors.error),
                    onPressed: _busy ? null : _startRecording,
                    icon: const Icon(Icons.fiber_manual_record_rounded),
                    label: const Text('ضبط'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                TextButton(
                  onPressed: _busy ? null : () => _reset(),
                  child: const Text('انصراف'),
                ),
              ],
            ),
          ] else if (recording) ...[
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    style: _rowFilledStyle(backgroundColor: AppColors.error),
                    onPressed: _busy ? null : () => _finishRecording(cancel: false),
                    icon: const Icon(Icons.stop_rounded),
                    label: const Text('پایان ضبط'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                TextButton(
                  onPressed: _busy ? null : () => _finishRecording(cancel: true),
                  child: const Text('لغو'),
                ),
              ],
            ),
          ] else ...[
            Row(
              children: [
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          await _reset(reopenPreview: _cameraSupported);
                        },
                  child: Text(_cameraSupported ? 'ضبط دوباره' : 'انتخاب دوباره'),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: FilledButton.icon(
                    style: _rowFilledStyle(),
                    onPressed: _busy ? null : _useRecording,
                    icon: const Icon(Icons.check_rounded),
                    label: const Text('استفاده از این ویدیو'),
                  ),
                ),
              ],
            ),
            if (_cameraSupported)
              TextButton.icon(
                onPressed: _busy ? null : _pickClip,
                icon: const Icon(Icons.video_file_rounded),
                label: const Text('انتخاب از فایل'),
              ),
          ],
        ],
      ),
    );
  }
}
