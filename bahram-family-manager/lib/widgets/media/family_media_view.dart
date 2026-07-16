import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
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
  });

  final FamilyMediaRef media;
  final double height;
  final BorderRadius? borderRadius;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(18);
    final url = media.playableUrl;

    if (media.isImage && url != null) {
      return _ImageView(
        url: url,
        maxHeight: height,
        radius: radius,
      );
    }
    if (media.isVideo && url != null) {
      return _VideoView(url: url, height: height, radius: radius);
    }
    if (media.isAudio && url != null) {
      return _AudioView(media: media, url: url, compact: compact);
    }

    return MediaThumbnail(media: media, height: height, borderRadius: radius);
  }
}

class _ImageView extends StatelessWidget {
  const _ImageView({
    required this.url,
    required this.radius,
    this.maxHeight = 360,
  });

  final String url;
  final double maxHeight;
  final BorderRadius radius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: radius,
      child: SizedBox(
        width: double.infinity,
        height: maxHeight,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              url,
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
            ),
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
  const _VideoView({required this.url, required this.height, required this.radius});

  final String url;
  final double height;
  final BorderRadius radius;

  @override
  State<_VideoView> createState() => _VideoViewState();
}

class _VideoViewState extends State<_VideoView> {
  late final VideoPlayerController _controller;
  var _ready = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        if (mounted) setState(() => _ready = true);
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: widget.radius,
      child: Container(
        color: Colors.black,
        height: widget.height,
        child: Stack(
          alignment: Alignment.center,
          children: [
            if (_ready)
              AspectRatio(
                aspectRatio: _controller.value.aspectRatio,
                child: VideoPlayer(_controller),
              )
            else
              const CircularProgressIndicator(color: Colors.white),
            if (_ready)
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.25),
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  iconSize: 52,
                  color: Colors.white,
                  icon: Icon(_controller.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded),
                  onPressed: () {
                    setState(() {
                      _controller.value.isPlaying ? _controller.pause() : _controller.play();
                    });
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AudioView extends StatefulWidget {
  const _AudioView({required this.media, required this.url, required this.compact});

  final FamilyMediaRef media;
  final String url;
  final bool compact;

  @override
  State<_AudioView> createState() => _AudioViewState();
}

class _AudioViewState extends State<_AudioView> {
  final _player = AudioPlayer();
  var _loading = true;
  var _playing = false;

  @override
  void initState() {
    super.initState();
    _init();
    _player.playerStateStream.listen((state) {
      if (!mounted) return;
      setState(() => _playing = state.playing);
    });
  }

  Future<void> _init() async {
    try {
      await _player.setUrl(widget.url);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final duration = widget.media.duration;
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
                  duration != null && duration > 0 ? formatDuration(duration) : 'فایل صوتی',
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
