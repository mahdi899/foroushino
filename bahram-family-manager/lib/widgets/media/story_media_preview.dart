import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/core/utils/story_aspect.dart';
import 'package:bahram_family_manager/core/utils/story_video_controller.dart';
import 'package:bahram_family_manager/models/models.dart';

/// 9:16 story preview — matches full-screen mobile viewer on the site.
class StoryMediaPreview extends StatelessWidget {
  const StoryMediaPreview({
    super.key,
    required this.media,
    this.maxWidth = 280,
    this.showBadge = true,
    this.localBytes,
    this.localUrl,
  });

  final FamilyMediaRef media;
  final double maxWidth;
  final bool showBadge;
  final Uint8List? localBytes;
  final String? localUrl;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: AspectRatio(
          aspectRatio: kStoryAspectRatio,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Stack(
              fit: StackFit.expand,
              children: [
                _StoryMediaFill(media: media, localBytes: localBytes, localUrl: localUrl),
                if (showBadge)
                  Positioned(
                    top: AppSpacing.sm,
                    right: AppSpacing.sm,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '۹:۱۶',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StoryMediaFill extends StatelessWidget {
  const _StoryMediaFill({
    required this.media,
    this.localBytes,
    this.localUrl,
  });

  final FamilyMediaRef media;
  final Uint8List? localBytes;
  final String? localUrl;

  @override
  Widget build(BuildContext context) {
    if (localBytes != null && media.isImage) {
      return Image.memory(
        localBytes!,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        gaplessPlayback: true,
      );
    }

    if (localUrl != null && media.isVideo) {
      return _StoryVideoFill(url: localUrl!);
    }

    final url = media.playableUrl;
    if (media.isImage && url != null) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return Container(
            color: AppColors.surfaceSoft,
            child: const Center(child: CircularProgressIndicator()),
          );
        },
        errorBuilder: (_, __, ___) => Container(
          color: AppColors.surfaceSoft,
          child: const Icon(Icons.broken_image_rounded, color: AppColors.textMuted, size: 40),
        ),
      );
    }
    if (media.isVideo && url != null) {
      return _StoryVideoFill(url: url);
    }
    return Container(
      color: AppColors.surfaceSoft,
      child: const Center(child: Icon(Icons.perm_media_rounded, color: AppColors.textMuted, size: 40)),
    );
  }
}

class _StoryVideoFill extends StatefulWidget {
  const _StoryVideoFill({required this.url});

  final String url;

  @override
  State<_StoryVideoFill> createState() => _StoryVideoFillState();
}

class _StoryVideoFillState extends State<_StoryVideoFill> {
  late final VideoPlayerController _controller;
  var _ready = false;

  @override
  void initState() {
    super.initState();
    _controller = createStoryVideoController(widget.url)
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
    if (!_ready) {
      return Container(
        color: Colors.black,
        child: const Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return FittedBox(
      fit: BoxFit.cover,
      clipBehavior: Clip.hardEdge,
      child: SizedBox(
        width: _controller.value.size.width,
        height: _controller.value.size.height,
        child: VideoPlayer(_controller),
      ),
    );
  }
}
