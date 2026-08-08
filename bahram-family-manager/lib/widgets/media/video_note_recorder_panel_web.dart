import 'dart:async';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:typed_data';
import 'dart:ui' show FontFeature;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/local_media_url.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class VideoNoteRecordingResult {
  const VideoNoteRecordingResult({
    required this.bytes,
    required this.filename,
    this.localPath,
    this.mimeType = 'video/webm',
  });

  final Uint8List bytes;
  final String filename;
  final String? localPath;
  final String mimeType;
}

enum _Phase { idle, preview, recording, reviewing }

/// Telegram-style circular video note recorder (web / MediaRecorder).
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
  static const _viewType = 'bahram-family-video-note-preview';

  late final AnimationController _pulse;
  late final String _viewId;

  _Phase _phase = _Phase.idle;
  bool _busy = false;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;
  DateTime? _startedAt;

  html.MediaStream? _stream;
  html.MediaRecorder? _recorder;
  html.VideoElement? _liveVideo;
  final List<html.Blob> _chunks = [];

  Uint8List? _draftBytes;
  String? _draftFilename;
  String _draftMime = 'video/webm';
  String? _reviewUrl;
  VideoPlayerController? _reviewPlayer;

  @override
  void initState() {
    super.initState();
    _viewId = '$_viewType-${identityHashCode(this)}-${DateTime.now().microsecondsSinceEpoch}';
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    ui_web.platformViewRegistry.registerViewFactory(_viewId, (int viewId) {
      final video = html.VideoElement()
        ..autoplay = true
        ..muted = true
        ..controls = false
        ..setAttribute('playsinline', 'true')
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.objectFit = 'cover'
        ..style.borderRadius = '50%'
        ..style.transform = 'scaleX(-1)';
      _liveVideo = video;
      final stream = _stream;
      if (stream != null) {
        video.srcObject = stream;
        unawaited(video.play().catchError((_) {}));
      }
      return video;
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _pulse.dispose();
    unawaited(_stopStream());
    unawaited(_disposeReview());
    super.dispose();
  }

  Future<void> _disposeReview() async {
    final url = _reviewUrl;
    _reviewUrl = null;
    await _reviewPlayer?.dispose();
    _reviewPlayer = null;
    if (url != null) await revokeLocalMediaUrl(url);
  }

  Future<void> _stopStream() async {
    try {
      _recorder?.stop();
    } catch (_) {}
    _recorder = null;
    final stream = _stream;
    _stream = null;
    if (_liveVideo != null) {
      _liveVideo!.srcObject = null;
    }
    stream?.getTracks().forEach((track) => track.stop());
  }

  Future<bool> _ensureCamera() async {
    try {
      final devices = html.window.navigator.mediaDevices;
      if (devices == null) {
        widget.onError?.call('دوربین در این مرورگر در دسترس نیست.');
        return false;
      }
      final stream = await devices.getUserMedia({
        'audio': true,
        'video': {
          'facingMode': 'user',
          'width': {'ideal': 720},
          'height': {'ideal': 720},
        },
      });
      _stream = stream;
      final video = _liveVideo;
      if (video != null) {
        video.srcObject = stream;
        await video.play().catchError((_) {});
      }
      return true;
    } catch (_) {
      widget.onError?.call(
        'دسترسی به دوربین/میکروفون لازم است. مجوز را در مرورگر فعال کنید.',
      );
      return false;
    }
  }

  String _pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (final mime in candidates) {
      try {
        if (html.MediaRecorder.isTypeSupported(mime)) return mime;
      } catch (_) {}
    }
    return 'video/webm';
  }

  Future<void> _openPreview() async {
    if (!widget.enabled || _busy || _phase != _Phase.idle) return;
    setState(() => _busy = true);
    final ok = await _ensureCamera();
    if (!mounted) return;
    if (!ok) {
      setState(() => _busy = false);
      return;
    }
    setState(() {
      _busy = false;
      _phase = _Phase.preview;
    });
  }

  Future<void> _startRecording() async {
    if (!widget.enabled || _busy) return;
    if (_phase == _Phase.idle) {
      await _openPreview();
      if (_phase != _Phase.preview) return;
    }
    if (_phase != _Phase.preview || _stream == null) return;

    setState(() => _busy = true);
    try {
      _chunks.clear();
      final mime = _pickMimeType();
      _draftMime = mime.split(';').first;
      final recorder = html.MediaRecorder(_stream!, {'mimeType': mime});
      recorder.addEventListener('dataavailable', (html.Event event) {
        final e = event as html.BlobEvent;
        final data = e.data;
        if (data != null && data.size > 0) {
          _chunks.add(data);
        }
      });
      _recorder = recorder;
      recorder.start(250);
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
      widget.onError?.call('شروع ضبط ویدیو ممکن نشد.');
    }
  }

  Future<void> _finishRecording({required bool cancel}) async {
    if (_phase != _Phase.recording || _busy) return;
    setState(() => _busy = true);
    _ticker?.cancel();
    _pulse.stop();
    _pulse.reset();

    final recorder = _recorder;
    _recorder = null;
    final started = _startedAt;
    _startedAt = null;

    if (recorder != null) {
      final stopped = Completer<void>();
      void onStop(html.Event _) {
        recorder.removeEventListener('stop', onStop);
        if (!stopped.isCompleted) stopped.complete();
      }

      recorder.addEventListener('stop', onStop);
      try {
        recorder.stop();
      } catch (_) {
        if (!stopped.isCompleted) stopped.complete();
      }
      await stopped.future.timeout(const Duration(seconds: 3), onTimeout: () {});
      await Future<void>.delayed(const Duration(milliseconds: 80));
    }

    if (cancel) {
      _chunks.clear();
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
          _elapsed = Duration.zero;
        });
      }
      return;
    }

    final duration = started == null ? Duration.zero : DateTime.now().difference(started);
    if (duration < _minDuration || _chunks.isEmpty) {
      _chunks.clear();
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
          _elapsed = Duration.zero;
        });
      }
      widget.onError?.call('ویدیو خیلی کوتاه بود. دوباره ضبط کنید.');
      return;
    }

    try {
      final blob = html.Blob(_chunks, _draftMime);
      _chunks.clear();
      final reader = html.FileReader();
      final done = Completer<html.FileReader>();
      reader.onLoadEnd.listen((_) => done.complete(reader));
      reader.onError.listen((_) => done.completeError(StateError('read failed')));
      reader.readAsArrayBuffer(blob);
      await done.future;
      final buffer = reader.result;
      if (buffer is! ByteBuffer) {
        throw StateError('empty');
      }
      final bytes = buffer.asUint8List();
      final ext = _draftMime.contains('mp4') ? 'mp4' : 'webm';
      final filename = 'video_note_${DateTime.now().millisecondsSinceEpoch}.$ext';

      await _disposeReview();
      final url = await createLocalMediaUrl(bytes, _draftMime, extension: ext);
      final player = createVideoPlayerController(url, isLocalFile: false);
      await player.initialize();
      await player.setLooping(true);

      if (!mounted) {
        await player.dispose();
        await revokeLocalMediaUrl(url);
        return;
      }

      setState(() {
        _draftBytes = bytes;
        _draftFilename = filename;
        _reviewUrl = url;
        _reviewPlayer = player;
        _busy = false;
        _phase = _Phase.reviewing;
        _elapsed = duration;
      });
      await _stopStream();
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = _Phase.preview;
        });
      }
      widget.onError?.call('ذخیره ویدیو ضبط‌شده ممکن نشد.');
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
        mimeType: _draftMime,
      ),
    );
    await _resetToIdle();
  }

  Future<void> _discardReview() async {
    await _disposeReview();
    _draftBytes = null;
    _draftFilename = null;
    if (!mounted) return;
    setState(() {
      _phase = _Phase.idle;
      _elapsed = Duration.zero;
    });
    await _openPreview();
  }

  Future<void> _resetToIdle() async {
    _ticker?.cancel();
    await _disposeReview();
    await _stopStream();
    _draftBytes = null;
    _draftFilename = null;
    if (!mounted) return;
    setState(() {
      _phase = _Phase.idle;
      _busy = false;
      _elapsed = Duration.zero;
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

  String get _timerLabel {
    final total = _elapsed.inMilliseconds.clamp(0, _maxDuration.inMilliseconds);
    final secs = (total / 1000).floor();
    final mm = (secs ~/ 60).toString().padLeft(2, '0');
    final ss = (secs % 60).toString().padLeft(2, '0');
    return toFaDigits('$mm:$ss');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final recording = _phase == _Phase.recording;
    final reviewing = _phase == _Phase.reviewing;
    final live = _phase == _Phase.preview || _phase == _Phase.recording;

    return GlassPanel(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Text(
            reviewing ? 'بازبینی پیام ویدیویی' : 'پیام ویدیویی دایره‌ای',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: scheme.onSurface,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            reviewing
                ? 'اگر راضی هستید ارسال کنید؛ در غیر این صورت دوباره ضبط کنید.'
                : 'مثل تلگرام: دوربین را باز کنید، ضبط کنید (حداکثر ۶۰ ثانیه).',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.65)),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: 220,
            height: 220,
            child: AnimatedBuilder(
              animation: _pulse,
              builder: (context, child) {
                final scale = recording ? 1 + (_pulse.value * 0.04) : 1.0;
                return Transform.scale(scale: scale, child: child);
              },
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: recording
                        ? scheme.error.withValues(alpha: 0.9)
                        : scheme.primary.withValues(alpha: 0.45),
                    width: recording ? 3.5 : 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (recording ? scheme.error : scheme.primary).withValues(alpha: 0.18),
                      blurRadius: 18,
                      spreadRadius: 1,
                    ),
                  ],
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
                    : live
                        ? HtmlElementView(viewType: _viewId)
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
          ),
          const SizedBox(height: AppSpacing.sm),
          if (_phase == _Phase.recording || _phase == _Phase.reviewing)
            Text(
              _timerLabel,
              style: TextStyle(
                fontFeatures: const [FontFeature.tabularFigures()],
                fontWeight: FontWeight.w700,
                color: recording ? scheme.error : scheme.onSurface,
              ),
            ),
          const SizedBox(height: AppSpacing.md),
          if (_phase == _Phase.idle)
            FilledButton.icon(
              onPressed: (!widget.enabled || _busy) ? null : _openPreview,
              icon: const Icon(Icons.camera_front_rounded),
              label: const Text('باز کردن دوربین'),
            )
          else if (_phase == _Phase.preview)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _busy ? null : _resetToIdle,
                  child: const Text('انصراف'),
                ),
                const SizedBox(width: AppSpacing.sm),
                FilledButton.icon(
                  onPressed: (!widget.enabled || _busy) ? null : _startRecording,
                  icon: const Icon(Icons.fiber_manual_record_rounded),
                  label: const Text('شروع ضبط'),
                  style: FilledButton.styleFrom(backgroundColor: scheme.error),
                ),
              ],
            )
          else if (_phase == _Phase.recording)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _busy ? null : () => _finishRecording(cancel: true),
                  child: const Text('لغو'),
                ),
                const SizedBox(width: AppSpacing.sm),
                FilledButton.icon(
                  onPressed: _busy ? null : () => _finishRecording(cancel: false),
                  icon: const Icon(Icons.stop_rounded),
                  label: const Text('پایان ضبط'),
                ),
              ],
            )
          else
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: _busy ? null : _discardReview,
                  child: const Text('ضبط دوباره'),
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
