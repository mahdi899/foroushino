import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/local_media_url.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/core/utils/read_file_bytes.dart';
import 'package:bahram_family_manager/core/utils/media_size_guard.dart';
import 'package:bahram_family_manager/core/utils/wav_audio_edit.dart';
import 'package:bahram_family_manager/services/voice_local_store.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class VoiceRecordingResult {
  const VoiceRecordingResult({
    required this.bytes,
    required this.filename,
    this.localPath,
  });

  final Uint8List bytes;
  final String filename;

  /// Absolute path when saved under app documents (`voice_recordings/`).
  final String? localPath;
}

enum _VoicePhase { idle, recording, reviewing }

/// Tap-to-record mic with post-capture review (play / trim / boost).
class VoiceRecorderPanel extends StatefulWidget {
  const VoiceRecorderPanel({
    super.key,
    required this.onRecorded,
    this.onError,
    this.enabled = true,
  });

  final ValueChanged<VoiceRecordingResult> onRecorded;
  final ValueChanged<String>? onError;
  final bool enabled;

  @override
  State<VoiceRecorderPanel> createState() => _VoiceRecorderPanelState();
}

class _VoiceRecorderPanelState extends State<VoiceRecorderPanel>
    with SingleTickerProviderStateMixin {
  static const _minDuration = Duration(milliseconds: 500);
  static const _maxDuration = Duration(minutes: 15);

  final _recorder = AudioRecorder();
  late final AnimationController _pulse;

  _VoicePhase _phase = _VoicePhase.idle;
  bool _busy = false;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;
  StreamSubscription<Amplitude>? _ampSub;
  double _amplitude = 0;
  final List<double> _livePeaks = [];
  DateTime? _startedAt;
  String? _path;
  String? _filename;

  Uint8List? _draftBytes;
  String? _draftFilename;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _ampSub?.cancel();
    _pulse.dispose();
    unawaited(_safeCancelRecorder());
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _safeCancelRecorder() async {
    try {
      if (await _recorder.isRecording()) {
        await _recorder.cancel();
      }
    } catch (_) {}
  }

  Future<bool> _ensureMicPermission() async {
    try {
      if (!kIsWeb) {
        var status = await Permission.microphone.status;
        if (status.isGranted) return true;
        status = await Permission.microphone.request();
        if (status.isGranted) return true;
        if (status.isPermanentlyDenied || status.isRestricted) {
          widget.onError?.call(
            'دسترسی میکروفون رد شده است. از تنظیمات دستگاه مجوز را فعال کنید.',
          );
          return false;
        }
      }
    } catch (_) {}

    final allowed = await _recorder.hasPermission();
    if (!allowed) {
      widget.onError?.call('برای ضبط ویس به دسترسی میکروفون نیاز است.');
    }
    return allowed;
  }

  /// Prefer WAV so trim/boost can run in Dart without ffmpeg.
  Future<AudioEncoder> _pickEncoder() async {
    if (await _recorder.isEncoderSupported(AudioEncoder.wav)) {
      return AudioEncoder.wav;
    }
    if (await _recorder.isEncoderSupported(AudioEncoder.aacLc)) {
      return AudioEncoder.aacLc;
    }
    return AudioEncoder.wav;
  }

  String _extensionFor(AudioEncoder encoder) => switch (encoder) {
        AudioEncoder.aacLc || AudioEncoder.aacEld || AudioEncoder.aacHe => 'm4a',
        AudioEncoder.wav => 'wav',
        AudioEncoder.opus => 'opus',
        _ => 'wav',
      };

  Future<String> _buildPath(AudioEncoder encoder) async {
    final ext = _extensionFor(encoder);
    final name = 'voice_${DateTime.now().millisecondsSinceEpoch}.$ext';
    if (kIsWeb) return name;
    final dir = await getTemporaryDirectory();
    return p.join(dir.path, name);
  }

  Future<void> _toggleRecording() async {
    if (!widget.enabled || _busy) return;
    if (_phase == _VoicePhase.recording) {
      await _finishRecording(cancel: false);
    } else if (_phase == _VoicePhase.idle) {
      await _startRecording();
    }
  }

  Future<void> _startRecording() async {
    if (!widget.enabled || _busy || _phase != _VoicePhase.idle) return;
    setState(() => _busy = true);

    try {
      if (!await _ensureMicPermission()) {
        if (mounted) setState(() => _busy = false);
        return;
      }

      final encoder = await _pickEncoder();
      final path = await _buildPath(encoder);
      final filename = p.basename(path);

      await _recorder.start(
        RecordConfig(
          encoder: encoder,
          bitRate: 128000,
          sampleRate: 44100,
          numChannels: 1,
        ),
        path: path,
      );

      _path = path;
      _filename = filename;
      _startedAt = DateTime.now();
      _elapsed = Duration.zero;
      _amplitude = 0;
      _livePeaks
        ..clear()
        ..addAll(List<double>.filled(24, 0.08));

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

      await _ampSub?.cancel();
      _ampSub = _recorder
          .onAmplitudeChanged(const Duration(milliseconds: 80))
          .listen((amp) {
        if (!mounted) return;
        final normalized = ((amp.current + 50) / 50).clamp(0.0, 1.0);
        setState(() {
          _amplitude = normalized;
          if (_livePeaks.isNotEmpty) {
            _livePeaks.removeAt(0);
            _livePeaks.add(normalized);
          }
        });
      });

      _pulse.repeat(reverse: true);
      if (mounted) {
        setState(() {
          _phase = _VoicePhase.recording;
          _busy = false;
        });
      }
    } catch (_) {
      widget.onError?.call('شروع ضبط ناموفق بود.');
      await _resetSession();
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _finishRecording({required bool cancel}) async {
    if (_phase != _VoicePhase.recording || _busy) return;
    setState(() => _busy = true);

    final startedAt = _startedAt;
    final path = _path;
    final filename = _filename;
    final elapsed = startedAt == null
        ? Duration.zero
        : DateTime.now().difference(startedAt);

    _ticker?.cancel();
    _ticker = null;
    await _ampSub?.cancel();
    _ampSub = null;
    _pulse.stop();
    _pulse.reset();

    try {
      if (cancel) {
        await _recorder.cancel();
        await _resetSession();
        return;
      }

      if (elapsed < _minDuration) {
        await _recorder.cancel();
        await _resetSession();
        widget.onError?.call('ویس خیلی کوتاه بود. دوباره امتحان کنید.');
        return;
      }

      final stoppedPath = await _recorder.stop() ?? path;
      if (stoppedPath == null || filename == null) {
        await _resetSession();
        widget.onError?.call('ذخیره ویس ناموفق بود.');
        return;
      }

      final bytes = await readFileBytes(stoppedPath);
      if (bytes.isEmpty) {
        await _resetSession();
        widget.onError?.call('فایل ویس خالی است.');
        return;
      }

      _path = null;
      _filename = null;
      _startedAt = null;
      _elapsed = Duration.zero;
      _amplitude = 0;

      if (!mounted) return;
      setState(() {
        _draftBytes = bytes;
        _draftFilename = filename;
        _phase = _VoicePhase.reviewing;
        _busy = false;
      });
    } catch (_) {
      await _resetSession();
      widget.onError?.call('پایان ضبط ناموفق بود.');
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resetSession() async {
    _path = null;
    _filename = null;
    _startedAt = null;
    _elapsed = Duration.zero;
    _amplitude = 0;
    _livePeaks.clear();
    if (mounted) {
      setState(() => _phase = _VoicePhase.idle);
    } else {
      _phase = _VoicePhase.idle;
    }
  }

  void _discardDraft() {
    setState(() {
      _draftBytes = null;
      _draftFilename = null;
      _phase = _VoicePhase.idle;
    });
  }

  Future<void> _confirmDraft(Uint8List bytes, String filename) async {
    SavedVoiceRecording? saved;
    if (!kIsWeb) {
      try {
        saved = await VoiceLocalStore.save(bytes, filename);
      } catch (_) {
        widget.onError?.call('ذخیره ویس روی دستگاه ناموفق بود.');
        return;
      }
    }

    if (!mounted) return;
    setState(() {
      _draftBytes = null;
      _draftFilename = null;
      _phase = _VoicePhase.idle;
    });
    widget.onRecorded(
      VoiceRecordingResult(
        bytes: bytes,
        filename: saved?.filename ?? filename,
        localPath: saved?.absolutePath,
      ),
    );
  }

  String get _timerLabel {
    final total = _elapsed.inMilliseconds;
    final minutes = (total ~/ 60000).toString().padLeft(2, '0');
    final seconds = ((total % 60000) ~/ 1000).toString().padLeft(2, '0');
    return toFaDigits('$minutes:$seconds');
  }

  @override
  Widget build(BuildContext context) {
    if (_phase == _VoicePhase.reviewing &&
        _draftBytes != null &&
        _draftFilename != null) {
      return _VoiceReviewEditor(
        bytes: _draftBytes!,
        filename: _draftFilename!,
        livePeaks: List<double>.from(_livePeaks),
        onConfirm: _confirmDraft,
        onRetake: _discardDraft,
        onError: widget.onError,
      );
    }

    final scheme = context.appScheme;
    final muted = context.appTextMuted;
    final enabled = widget.enabled && !_busy;
    final recording = _phase == _VoicePhase.recording;

    return GlassPanel(
      borderRadius: AppRadius.card,
      blur: 0,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xl,
      ),
      child: Column(
        children: [
          if (recording) ...[
            AnimatedBuilder(
              animation: _pulse,
              builder: (context, child) {
                final scale = 1 + (_pulse.value * 0.08);
                return Transform.scale(scale: scale, child: child);
              },
              child: Icon(Icons.mic_rounded, size: 28, color: scheme.primary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _timerLabel,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 22,
                color: scheme.onSurface,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _WaveformBars(levels: _livePeaks, fallback: _amplitude, active: true),
            const SizedBox(height: AppSpacing.md),
            Text(
              'برای پایان ضبط دوباره روی دکمه بزنید',
              style: TextStyle(color: muted, fontSize: 13),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton.icon(
              onPressed: enabled
                  ? () => unawaited(_finishRecording(cancel: true))
                  : null,
              icon: const Icon(Icons.close_rounded, color: AppColors.error, size: 18),
              label: const Text('لغو', style: TextStyle(color: AppColors.error)),
            ),
          ] else ...[
            Text(
              'برای شروع ضبط ضربه بزنید',
              style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'نیازی به نگه داشتن دکمه نیست — تا ۱۵ دقیقه می‌توانید ضبط کنید',
              textAlign: TextAlign.center,
              style: TextStyle(color: muted, fontSize: 13),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: enabled ? () => unawaited(_toggleRecording()) : null,
              customBorder: const CircleBorder(),
              child: AnimatedContainer(
                duration: AppMotion.fast,
                width: recording ? 76 : 64,
                height: recording ? 76 : 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: recording ? null : AppGradients.primary,
                  color: recording ? AppColors.error : null,
                  boxShadow: recording ? AppShadows.primaryGlow : AppShadows.soft,
                ),
                child: Icon(
                  recording ? Icons.stop_rounded : Icons.mic_none_rounded,
                  color: Colors.white,
                  size: recording ? 34 : 28,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VoiceReviewEditor extends StatefulWidget {
  const _VoiceReviewEditor({
    required this.bytes,
    required this.filename,
    required this.livePeaks,
    required this.onConfirm,
    required this.onRetake,
    this.onError,
  });

  final Uint8List bytes;
  final String filename;
  final List<double> livePeaks;
  final Future<void> Function(Uint8List bytes, String filename) onConfirm;
  final VoidCallback onRetake;
  final ValueChanged<String>? onError;

  @override
  State<_VoiceReviewEditor> createState() => _VoiceReviewEditorState();
}

class _VoiceReviewEditorState extends State<_VoiceReviewEditor> {
  final _player = AudioPlayer();

  late List<double> _peaks;
  var _editable = false;
  var _loading = true;
  var _playing = false;
  var _busy = false;

  RangeValues _trim = const RangeValues(0, 1);
  double _gain = 1;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  String? _previewUrl;

  StreamSubscription<Duration>? _posSub;
  StreamSubscription<PlayerState>? _stateSub;
  StreamSubscription<Duration?>? _durSub;

  @override
  void initState() {
    super.initState();
    _editable = WavAudioEdit.isWav(widget.bytes);
    _peaks = _editable
        ? WavAudioEdit.peaks(widget.bytes)
        : (widget.livePeaks.isEmpty
            ? List<double>.filled(48, 0.2)
            : widget.livePeaks);
    _duration = WavAudioEdit.durationOf(widget.bytes) ?? Duration.zero;
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    try {
      if (_previewUrl != null) {
        await revokeLocalMediaUrl(_previewUrl);
      }
      _previewUrl = await createLocalMediaUrl(
        widget.bytes,
        _editable ? 'audio/wav' : 'audio/mp4',
        extension: p.extension(widget.filename).replaceFirst('.', ''),
      );
      final total = await setAudioPlayerSource(
        _player,
        _previewUrl!,
        isLocalFile: !kIsWeb,
      );
      if (total != null && total > Duration.zero) {
        _duration = total;
      }
      _durSub = _player.durationStream.listen((total) {
        if (!mounted || total == null || total <= Duration.zero) return;
        setState(() => _duration = total);
      });
      // HTMLMediaElement volume is [0, 1] on web — never pass gain > 1 here.
      await _player.setVolume(_previewVolume);
      _posSub = _player.positionStream.listen((pos) {
        if (!mounted) return;
        setState(() => _position = pos);
        if (_playing && pos >= _trimEnd && _trimEnd > Duration.zero) {
          unawaited(_player.pause());
          unawaited(_seekToTrimStart());
        }
      });
      _stateSub = _player.playerStateStream.listen((state) {
        if (!mounted) return;
        setState(() => _playing = state.playing);
        if (state.processingState == ProcessingState.completed) {
          unawaited(_player.seek(_trimStart));
          unawaited(_player.pause());
        }
      });
      await _seekToTrimStart();
    } catch (_) {
      widget.onError?.call('پخش پیش‌نمایش ویس ممکن نشد.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Browser media elements only accept 0..1; real boost is applied on confirm.
  double get _previewVolume => _gain.clamp(0.0, 1.0);

  Future<void> _seekToTrimStart() async {
    if (_duration <= Duration.zero) return;
    await _player.seek(_trimStart);
  }

  Future<void> _applyClipPreview() async {
    await _player.pause();
    await _player.setVolume(_previewVolume);
    await _seekToTrimStart();
  }

  Future<void> _togglePlay() async {
    if (_loading) return;
    if (_playing) {
      await _player.pause();
      return;
    }
    if (_position < _trimStart || _position >= _trimEnd) {
      await _seekToTrimStart();
    }
    await _player.play();
  }

  Future<void> _confirm() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await _player.pause();
      var out = widget.bytes;
      var name = widget.filename;
      if (_editable) {
        out = WavAudioEdit.process(
          widget.bytes,
          startRatio: _trim.start,
          endRatio: _trim.end,
          gain: _gain,
        );
        if (!name.toLowerCase().endsWith('.wav')) {
          name = '${p.basenameWithoutExtension(name)}.wav';
        }
      }
      final oversize = MediaSizeGuard.oversizeMessage(out.length, type: 'voice');
      if (oversize != null) {
        widget.onError?.call(oversize);
        if (mounted) setState(() => _busy = false);
        return;
      }
      await widget.onConfirm(out, name);
    } catch (_) {
      widget.onError?.call('اعمال ویرایش ویس ناموفق بود.');
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _posSub?.cancel();
    _stateSub?.cancel();
    _durSub?.cancel();
    _player.dispose();
    unawaited(revokeLocalMediaUrl(_previewUrl));
    super.dispose();
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return toFaDigits('$m:$s');
  }

  Duration get _trimStart => Duration(
        milliseconds: (_duration.inMilliseconds * _trim.start).round(),
      );
  Duration get _trimEnd => Duration(
        milliseconds: (_duration.inMilliseconds * _trim.end).round(),
      );
  Duration get _selectedLength => _trimEnd - _trimStart;

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final muted = context.appTextMuted;
    final progress = _duration.inMilliseconds == 0
        ? 0.0
        : (_position.inMilliseconds / _duration.inMilliseconds).clamp(0.0, 1.0);

    return GlassPanel(
      borderRadius: AppRadius.card,
      blur: 0,
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'بازبینی ویس',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: scheme.onSurface,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            _editable
                ? 'گوش دهید، ابتدا/انتها را ببرید؛ تقویت بالای ۱× روی فایل نهایی اعمال می‌شود'
                : 'گوش دهید و تأیید کنید (برش فقط برای WAV فعال است)',
            style: TextStyle(color: muted, fontSize: 13),
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primaryDark.withValues(alpha: 0.92),
                  AppColors.primary,
                  AppColors.accent,
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppShadows.panelGlow,
            ),
            child: Column(
              children: [
                SizedBox(
                  height: 56,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: _ReviewWavePainter(
                      peaks: _peaks,
                      trim: _trim,
                      playhead: progress,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    IconButton(
                      onPressed: _loading || _busy ? null : () => unawaited(_togglePlay()),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.18),
                        foregroundColor: Colors.white,
                      ),
                      icon: _loading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Icon(
                              _playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                            ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        '${_fmt(_position)} / ${_fmt(_selectedLength)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                    Text(
                      widget.filename,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.75),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (_editable) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              'برش ابتدا و انتها',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: scheme.onSurface,
              ),
            ),
            RangeSlider(
              values: _trim,
              min: 0,
              max: 1,
              divisions: 100,
              labels: RangeLabels(_fmt(_trimStart), _fmt(_trimEnd)),
              onChanged: _busy
                  ? null
                  : (v) {
                      if (v.end - v.start < 0.02) return;
                      setState(() => _trim = v);
                    },
              onChangeEnd: (_) => unawaited(_applyClipPreview()),
            ),
            Text(
              'تقویت صدا  (${toFaDigits(_gain.toStringAsFixed(1))}×)',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: scheme.onSurface,
              ),
            ),
            Slider(
              value: _gain,
              min: 1,
              max: 2.5,
              divisions: 15,
              label: '${_gain.toStringAsFixed(1)}×',
              onChanged: _busy
                  ? null
                  : (v) {
                      setState(() => _gain = v);
                      unawaited(_player.setVolume(v.clamp(0.0, 1.0)));
                    },
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : widget.onRetake,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('ضبط دوباره'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _busy ? null : () => unawaited(_confirm()),
                  icon: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_rounded, size: 18),
                  label: const Text('تأیید ویس'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WaveformBars extends StatelessWidget {
  const _WaveformBars({
    required this.levels,
    required this.fallback,
    required this.active,
  });

  final List<double> levels;
  final double fallback;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? context.appScheme.primary : AppColors.error;
    final bars = levels.isEmpty ? List<double>.filled(16, fallback) : levels;
    return SizedBox(
      height: 36,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(bars.length.clamp(1, 24), (i) {
          final level = bars[i % bars.length];
          final wave = math.sin((i / math.max(1, bars.length - 1)) * math.pi);
          final h = 6 + (wave * 8) + (level * 20);
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 1.5),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 80),
              width: 3,
              height: h.clamp(6, 36),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.35 + level * 0.55),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _ReviewWavePainter extends CustomPainter {
  _ReviewWavePainter({
    required this.peaks,
    required this.trim,
    required this.playhead,
  });

  final List<double> peaks;
  final RangeValues trim;
  final double playhead;

  @override
  void paint(Canvas canvas, Size size) {
    if (peaks.isEmpty || size.width <= 0) return;
    final barWidth = size.width / peaks.length;
    final mid = size.height / 2;

    for (var i = 0; i < peaks.length; i++) {
      final x = i * barWidth;
      final ratio = i / peaks.length;
      final inTrim = ratio >= trim.start && ratio <= trim.end;
      final h = (6 + peaks[i] * (size.height - 12)).clamp(6.0, size.height);
      final paint = Paint()
        ..color = Colors.white.withValues(alpha: inTrim ? 0.92 : 0.28)
        ..strokeCap = StrokeCap.round
        ..strokeWidth = math.max(2, barWidth * 0.55);
      canvas.drawLine(
        Offset(x + barWidth / 2, mid - h / 2),
        Offset(x + barWidth / 2, mid + h / 2),
        paint,
      );
    }

    final playX = (playhead.clamp(0.0, 1.0)) * size.width;
    canvas.drawLine(
      Offset(playX, 0),
      Offset(playX, size.height),
      Paint()
        ..color = Colors.white
        ..strokeWidth = 1.5,
    );
  }

  @override
  bool shouldRepaint(covariant _ReviewWavePainter oldDelegate) {
    return oldDelegate.peaks != peaks ||
        oldDelegate.trim != trim ||
        oldDelegate.playhead != playhead;
  }
}
