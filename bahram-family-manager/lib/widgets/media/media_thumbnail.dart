import 'dart:typed_data';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';

class MediaThumbnail extends StatelessWidget {
  const MediaThumbnail({
    super.key,
    required this.media,
    this.height = 160,
    this.borderRadius,
    this.localBytes,
  });

  final FamilyMediaRef media;
  final double height;
  final BorderRadius? borderRadius;
  final Uint8List? localBytes;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? AppRadius.tileBorder;

    if (media.type == 'image' && localBytes != null && localBytes!.isNotEmpty) {
      return ClipRRect(
        borderRadius: radius,
        child: Image.memory(
          localBytes!,
          height: height,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _Placeholder(type: media.type, height: height, radius: radius),
        ),
      );
    }

    final url = media.playableUrl;

    if (media.type == 'image' && url != null) {
      return ClipRRect(
        borderRadius: radius,
        child: CachedNetworkImage(
          imageUrl: url,
          height: height,
          width: double.infinity,
          fit: BoxFit.cover,
          placeholder: (_, __) => _Placeholder(type: media.type, height: height, radius: radius),
          errorWidget: (_, __, ___) => _Placeholder(type: media.type, height: height, radius: radius),
        ),
      );
    }

    return _Placeholder(
      type: media.type,
      height: height,
      radius: radius,
      duration: media.duration,
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({
    required this.type,
    required this.height,
    required this.radius,
    this.duration,
  });

  final String type;
  final double height;
  final BorderRadius radius;
  final int? duration;

  IconData get _icon => switch (type) {
        'image' => Icons.image_rounded,
        'video' => Icons.videocam_rounded,
        'audio' || 'voice' => Icons.mic_rounded,
        _ => Icons.perm_media_rounded,
      };

  String get _label => switch (type) {
        'image' => 'تصویر',
        'video' => 'ویدیو',
        'audio' || 'voice' => 'پیام صوتی',
        _ => 'رسانه',
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: radius,
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(_icon, size: 36, color: AppColors.primary),
          const SizedBox(height: AppSpacing.sm),
          Text(_label, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          if (duration != null && duration! > 0) ...[
            const SizedBox(height: 4),
            Text(formatDuration(duration!), style: const TextStyle(color: AppColors.textSubtle, fontSize: 12)),
          ],
        ],
      ),
    );
  }
}

String formatDuration(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '${toFaDigits(m.toString())}:${toFaDigits(s.toString().padLeft(2, '0'))}';
}
