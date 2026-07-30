import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/read_file_bytes.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class VoiceRecordingResult {
  const VoiceRecordingResult({required this.bytes, required this.filename});

  final Uint8List bytes;
  final String filename;
}

/// Telegram-style hold-to-record mic for voice posts.
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

  final _recorder = AudioRecorder();
  late final AnimationController _pulse;

  bool _recording = false;
  bool _cancelArmed = false;
  bool _busy = false;
  bool _pointerHeld = false;
  Duration _elapsed = Duration.zero;
  Timer? _ticker;
  StreamSubscription<Amplitude>? _ampSub;
  double _amplitude = 0;
  DateTime? _startedAt;
  String? _path;
  String? _filename;

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
    } catch (_) {
      // Fall through to record's own permission check.
    }

    final allowed = await _recorder.hasPermission();
    if (!allowed) {
      widget.onError?.call('برای ضبط ویس به دسترسی میکروفون نیاز است.');
    }
    return allowed;
  }

  Future<AudioEncoder> _pickEncoder() async {
    if (await _recorder.isEncoderSupported(AudioEncoder.aacLc)) {
      return AudioEncoder.aacLc;
    }
    return AudioEncoder.wav;
  }

  String _extensionFor(AudioEncoder encoder) => switch (encoder) {
        AudioEncoder.aacLc || AudioEncoder.aacEld || AudioEncoder.aacHe => 'm4a',
        AudioEncoder.wav => 'wav',
        AudioEncoder.opus => 'opus',
        _ => 'm4a',
      };

  Future<String> _buildPath(AudioEncoder encoder) async {
    final ext = _extensionFor(encoder);
    final name = 'voice_${DateTime.now().millisecondsSinceEpoch}.$ext';
    if (kIsWeb) return name;
    final dir = await getTemporaryDirectory();
    return p.join(dir.path, name);
  }

  Future<void> _startRecording() async {
    if (!widget.enabled || _busy || _recording) return;
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
      _cancelArmed = false;
      _amplitude = 0;

      _ticker?.cancel();
      _ticker = Timer.periodic(const Duration(milliseconds: 100), (_) {
        final start = _startedAt;
        if (start == null || !mounted) return;
        setState(() => _elapsed = DateTime.now().difference(start));
      });

      await _ampSub?.cancel();
      _ampSub = _recorder
          .onAmplitudeChanged(const Duration(milliseconds: 80))
          .listen((amp) {
        if (!mounted) return;
        // dBFS typically ~ -160..0; map to 0..1 for bars.
        final normalized = ((amp.current + 50) / 50).clamp(0.0, 1.0);
        setState(() => _amplitude = normalized);
      });

      _pulse.repeat(reverse: true);
      if (mounted) {
        setState(() {
          _recording = true;
          _busy = false;
        });
      }

      // Finger released while permission dialog / start was pending.
      if (!_pointerHeld) {
        await _finishRecording(cancel: false);
      }
    } catch (e) {
      widget.onError?.call('شروع ضبط ناموفق بود.');
      await _resetSession();
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _finishRecording({required bool cancel}) async {
    if (!_recording || _busy) return;
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
      if (cancel || _cancelArmed) {
        await _recorder.cancel();
        await _resetSession();
        return;
      }

      if (elapsed < _minDuration) {
        await _recorder.cancel();
        await _resetSession();
        widget.onError?.call('ویس خیلی کوتاه بود. دکمه را نگه دارید.');
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

      await _resetSession();
      widget.onRecorded(VoiceRecordingResult(bytes: bytes, filename: filename));
    } catch (_) {
      await _resetSession();
      widget.onError?.call('پایان ضبط ناموفق بود.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resetSession() async {
    _path = null;
    _filename = null;
    _startedAt = null;
    _elapsed = Duration.zero;
    _amplitude = 0;
    _cancelArmed = false;
    if (mounted) setState(() => _recording = false);
  }

  String get _timerLabel {
    final total = _elapsed.inMilliseconds;
    final minutes = (total ~/ 60000).toString().padLeft(2, '0');
    final seconds = ((total % 60000) ~/ 1000).toString().padLeft(2, '0');
    return toFaDigits('$minutes:$seconds');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final muted = context.appTextMuted;
    final enabled = widget.enabled && !_busy;

    return GlassPanel(
      borderRadius: AppRadius.card,
      blur: 0,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xl,
      ),
      child: Column(
        children: [
          if (_recording) ...[
            AnimatedBuilder(
              animation: _pulse,
              builder: (context, child) {
                final scale = 1 + (_pulse.value * 0.08);
                return Transform.scale(scale: scale, child: child);
              },
              child: Icon(
                Icons.mic_rounded,
                size: 28,
                color: _cancelArmed ? AppColors.error : scheme.primary,
              ),
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
            _WaveformBars(level: _amplitude, active: !_cancelArmed),
            const SizedBox(height: AppSpacing.md),
            Text(
              _cancelArmed ? 'رها کنید تا لغو شود' : 'رها کنید تا تمام شود',
              style: TextStyle(
                color: _cancelArmed ? AppColors.error : muted,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextButton.icon(
              onPressed: enabled
                  ? () {
                      setState(() => _cancelArmed = true);
                      unawaited(_finishRecording(cancel: true));
                    }
                  : null,
              icon: const Icon(Icons.close_rounded, color: AppColors.error, size: 18),
              label: const Text('لغو', style: TextStyle(color: AppColors.error)),
            ),
          ] else ...[
            Text(
              'نگه دارید تا ویس بگیرید',
              style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'شبیه تلگرام — دکمه میکروفون را نگه دارید',
              style: TextStyle(color: muted, fontSize: 13),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
          Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: enabled && !_recording
                ? (_) {
                    _pointerHeld = true;
                    unawaited(_startRecording());
                  }
                : null,
            onPointerUp: (_) {
              _pointerHeld = false;
              if (_recording) unawaited(_finishRecording(cancel: false));
            },
            onPointerCancel: (_) {
              _pointerHeld = false;
              if (_recording) unawaited(_finishRecording(cancel: true));
            },
            child: AnimatedContainer(
              duration: AppMotion.fast,
              width: _recording ? 72 : 64,
              height: _recording ? 72 : 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: _cancelArmed ? null : AppGradients.primary,
                color: _cancelArmed ? AppColors.error : null,
                boxShadow: _recording ? AppShadows.primaryGlow : AppShadows.soft,
              ),
              child: Icon(
                _recording ? Icons.mic_rounded : Icons.mic_none_rounded,
                color: Colors.white,
                size: _recording ? 32 : 28,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WaveformBars extends StatelessWidget {
  const _WaveformBars({required this.level, required this.active});

  final double level;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? context.appScheme.primary : AppColors.error;
    return SizedBox(
      height: 36,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(16, (i) {
          final wave = math.sin((i / 15) * math.pi);
          final h = 6 + (wave * 10) + (level * 18 * (0.4 + wave * 0.6));
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
