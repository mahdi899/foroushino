import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/wav_audio_edit.dart';
import 'package:bahram_family_manager/core/utils/media_playback_source.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/media/media_thumbnail.dart';

class FamilyMediaView extends StatelessWidget {
  const FamilyMediaView({
    super.key,
    required this.media,
    this.height = 220,
    this.borderRadius,
    this.compact = false,
    this.previewOnly = false,
    this.circular = false,
    this.localBytes,
    this.localUrl,
  });

  final FamilyMediaRef media;
  final double height;
  final BorderRadius? borderRadius;
  final bool compact;
  /// List/feed previews — thumbnail only, no video decoder.
  final bool previewOnly;
  /// Telegram-style circular video note presentation (1:1 circle crop).
  final bool circular;
  /// Immediate preview from the just-picked file (before CDN URL exists).
  final Uint8List? localBytes;
  /// Blob URL (web) or temp file path (IO) for video/audio local preview.
  final String? localUrl;

  @override
  Widget build(BuildContext context) {
    final radius = circular
        ? BorderRadius.circular(height / 2)
        : (borderRadius ?? BorderRadius.circular(18));
    final networkUrl = media.playableUrl;
    final localPlaybackUrl = localUrl;

    if (previewOnly) {
      final thumb = MediaThumbnail(
        media: media,
        height: height,
        borderRadius: radius,
        localBytes: localBytes,
      );
      if (!circular) return thumb;
      return Align(
        child: SizedBox(
          width: height,
          height: height,
          child: ClipOval(child: thumb),
        ),
      );
    }

    if (media.isImage) {
      if (localBytes != null && localBytes!.isNotEmpty) {
        return _ImageView(
          bytes: localBytes,
          maxHeight: height,
          radius: radius,
        );
      }
      if (networkUrl != null) {
        return _ImageView(
          url: networkUrl,
          maxHeight: height,
          radius: radius,
        );
      }
    }

    if (media.isVideo) {
      // Prefer local file/blob while present — avoids ExoPlayer hitting a
      // broken localhost CDN URL from local Laravel during/after upload.
      final local = localPlaybackUrl;
      final preferLocal = local != null && local.isNotEmpty;
      final source = preferLocal ? local : networkUrl;
      if (source != null) {
        return _VideoView(
          key: ValueKey('video-$source-c$circular'),
          source: source,
          isFilePath: preferLocal && !kIsWeb,
          height: height,
          radius: radius,
          circular: circular,
        );
      }
    }

    if (media.isAudio) {
      final local = localPlaybackUrl;
      final preferLocal = local != null && local.isNotEmpty;
      final source = preferLocal ? local : networkUrl;
      if (source != null) {
        return _AudioView(
          key: ValueKey('audio-$source'),
          media: media,
          url: source,
          isFilePath: preferLocal && !kIsWeb,
          compact: compact,
          localBytes: localBytes,
        );
      }
    }

    final fallback = MediaThumbnail(
      media: media,
      height: height,
      borderRadius: radius,
      localBytes: localBytes,
    );
    if (!circular) return fallback;
    return Align(
      child: SizedBox(
        width: height,
        height: height,
        child: ClipOval(child: fallback),
      ),
    );
  }
}

class _ImageView extends StatelessWidget {
  const _ImageView({
    required this.radius,
    this.url,
    this.bytes,
    this.maxHeight = 360,
  });

  final String? url;
  final Uint8List? bytes;
  final double maxHeight;
  final BorderRadius radius;

  @override
  Widget build(BuildContext context) {
    final image = bytes != null && bytes!.isNotEmpty
        ? Image.memory(
            bytes!,
            fit: BoxFit.contain,
            width: double.infinity,
            height: maxHeight,
            errorBuilder: (_, __, ___) => const Center(
              child: Icon(Icons.broken_image_rounded, color: AppColors.textMuted, size: 40),
            ),
          )
        : Image.network(
            url!,
            fit: BoxFit.contain,
            width: double.infinity,
            height: maxHeight,
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return const Center(child: CircularProgressIndicator());
            },
            errorBuilder: (_, __, ___) => const Center(
              child: Icon(Icons.broken_image_rounded, color: AppColors.textMuted, size: 40),
            ),
          );

    return ClipRRect(
      borderRadius: radius,
      child: SizedBox(
        width: double.infinity,
        height: maxHeight,
        child: Stack(
          fit: StackFit.expand,
          children: [
            image,
            Positioned(
              top: AppSpacing.sm,
              right: AppSpacing.sm,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.image_rounded, color: Colors.white, size: 14),
                    SizedBox(width: 4),
                    Text('تصویر', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VideoView extends StatefulWidget {
  const _VideoView({
    super.key,
    required this.source,
    required this.height,
    required this.radius,
    this.isFilePath = false,
    this.circular = false,
  });

  final String source;
  final double height;
  final BorderRadius radius;
  final bool isFilePath;
  final bool circular;

  @override
  State<_VideoView> createState() => _VideoViewState();
}

class _VideoViewState extends State<_VideoView> {
  VideoPlayerController? _controller;
  var _ready = false;
  var _failed = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void didUpdateWidget(covariant _VideoView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.source != widget.source || oldWidget.isFilePath != widget.isFilePath) {
      _detachController();
      _ready = false;
      _failed = false;
      _errorMessage = null;
      _init();
    }
  }

  void _onControllerUpdate() {
    final controller = _controller;
    if (controller == null || !mounted) return;
    final err = controller.value.errorDescription;
    if (err != null && err.isNotEmpty && !_failed) {
      setState(() {
        _failed = true;
        _ready = false;
        _errorMessage = _friendlyPlaybackError(err, isFilePath: widget.isFilePath);
      });
    }
  }

  Future<void> _init() async {
    VideoPlayerController? controller;
    try {
      controller = createVideoPlayerController(
        widget.source,
        isLocalFile: widget.isFilePath,
      );
      _controller = controller;
      controller.addListener(_onControllerUpdate);
      await controller.initialize();
      if (!mounted) return;
      if (controller.value.hasError) {
        setState(() {
          _failed = true;
          _errorMessage = _friendlyPlaybackError(
            controller!.value.errorDescription,
            isFilePath: widget.isFilePath,
          );
        });
        return;
      }
      setState(() => _ready = true);
    } catch (e) {
      if (controller != null) {
        controller.removeListener(_onControllerUpdate);
        if (identical(_controller, controller)) {
          _controller = null;
        }
        await controller.dispose();
      }
      if (mounted) {
        setState(() {
          _failed = true;
          _errorMessage = _friendlyPlaybackError(
            e.toString(),
            isFilePath: widget.isFilePath,
          );
        });
      }
    }
  }

  void _detachController() {
    final controller = _controller;
    _controller = null;
    if (controller == null) return;
    controller.removeListener(_onControllerUpdate);
    controller.dispose();
  }

  @override
  void dispose() {
    _detachController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final videoChild = Stack(
      alignment: Alignment.center,
      fit: widget.circular ? StackFit.expand : StackFit.loose,
      children: [
        if (_ready && controller != null && !_failed)
          widget.circular
              ? FittedBox(
                  fit: BoxFit.cover,
                  clipBehavior: Clip.hardEdge,
                  child: SizedBox(
                    width: controller.value.size.width,
                    height: controller.value.size.height,
                    child: VideoPlayer(controller),
                  ),
                )
              : AspectRatio(
                  aspectRatio: controller.value.aspectRatio,
                  child: VideoPlayer(controller),
                )
        else if (_failed)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.videocam_off_rounded, color: Colors.white70, size: 36),
                const SizedBox(height: 8),
                Text(
                  _errorMessage ?? 'پخش ویدیو ممکن نشد.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          )
        else
          const CircularProgressIndicator(color: Colors.white),
        if (_ready && controller != null && !_failed)
          DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.25),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              iconSize: 52,
              color: Colors.white,
              icon: Icon(controller.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded),
              onPressed: () {
                setState(() {
                  controller.value.isPlaying ? controller.pause() : controller.play();
                });
              },
            ),
          ),
      ],
    );

    if (widget.circular) {
      return Align(
        child: SizedBox(
          width: widget.height,
          height: widget.height,
          child: ClipOval(
            child: ColoredBox(
              color: Colors.black,
              child: videoChild,
            ),
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: widget.radius,
      child: Container(
        color: Colors.black,
        height: widget.height,
        child: videoChild,
      ),
    );
  }
}

String _friendlyPlaybackError(String? raw, {required bool isFilePath}) {
  final text = (raw ?? '').toLowerCase();
  if (text.contains('localhost') ||
      text.contains('127.0.0.1') ||
      text.contains('failed to connect') ||
      text.contains('httpdatasource') ||
      text.contains('source error')) {
    return isFilePath
        ? 'باز کردن فایل محلی ناموفق بود. دوباره ضبط یا انتخاب کنید.'
        : 'اتصال به آدرس پخش برقرار نشد. اینترنت یا تنظیمات سرور را بررسی کنید.';
  }
  return isFilePath
      ? 'پخش فایل محلی ممکن نشد.'
      : 'پخش ویدیو از سرور ممکن نشد.';
}

class _AudioView extends StatefulWidget {
  const _AudioView({
    super.key,
    required this.media,
    required this.url,
    required this.compact,
    this.isFilePath = false,
    this.localBytes,
  });

  final FamilyMediaRef media;
  final String url;
  final bool compact;
  final bool isFilePath;
  final Uint8List? localBytes;

  @override
  State<_AudioView> createState() => _AudioViewState();
}

class _AudioViewState extends State<_AudioView> {
  final _player = AudioPlayer();
  var _loading = true;
  var _playing = false;
  Duration? _playerDuration;

  @override
  void initState() {
    super.initState();
    _init();
    _player.playerStateStream.listen((state) {
      if (!mounted) return;
      setState(() => _playing = state.playing);
    });
    _player.durationStream.listen((duration) {
      if (!mounted || duration == null || duration <= Duration.zero) return;
      setState(() => _playerDuration = duration);
    });
  }

  @override
  void didUpdateWidget(covariant _AudioView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url ||
        oldWidget.isFilePath != widget.isFilePath ||
        oldWidget.localBytes != widget.localBytes) {
      _loading = true;
      _playerDuration = null;
      _init();
    }
  }

  Future<void> _init() async {
    try {
      final total = await setAudioPlayerSource(
        _player,
        widget.url,
        isLocalFile: widget.isFilePath,
      );
      if (total != null && total > Duration.zero && mounted) {
        setState(() => _playerDuration = total);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Duration? get _displayDuration {
    final fromPlayer = _playerDuration;
    if (fromPlayer != null && fromPlayer > Duration.zero) return fromPlayer;
    final fromMedia = widget.media.duration;
    if (fromMedia != null && fromMedia > 0) {
      return Duration(seconds: fromMedia);
    }
    final bytes = widget.localBytes;
    if (bytes != null && bytes.isNotEmpty) {
      return WavAudioEdit.durationOf(bytes);
    }
    return null;
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final duration = _displayDuration;
    final durationLabel = duration != null && duration > Duration.zero
        ? formatDuration(duration.inSeconds)
        : 'فایل صوتی';
    return Container(
      padding: EdgeInsets.all(widget.compact ? AppSpacing.md : AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primaryDark.withValues(alpha: 0.92),
            AppColors.primary,
            AppColors.accent,
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppShadows.panelGlow,
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
            ),
            child: IconButton(
              onPressed: _loading
                  ? null
                  : () {
                      _playing ? _player.pause() : _player.play();
                    },
              icon: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(_playing ? Icons.pause_rounded : Icons.play_arrow_rounded, color: Colors.white),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.media.originalFilename ?? 'پیام صوتی',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  durationLabel,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
                ),
              ],
            ),
          ),
          const Icon(Icons.graphic_eq_rounded, color: Colors.white70),
        ],
      ),
    );
  }
}
