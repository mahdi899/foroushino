import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class UploadZone extends StatelessWidget {
  const UploadZone({
    super.key,
    required this.label,
    required this.onTap,
    this.uploading = false,
    this.progress = 0,
    this.enabled = true,
  });

  final String label;
  final VoidCallback? onTap;
  final bool uploading;
  final double progress;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    if (uploading) {
      return GlassPanel(
        borderRadius: AppRadius.card,
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: AppSpacing.md),
                const Text('در حال آپلود...', style: TextStyle(fontWeight: FontWeight.w600)),
                const Spacer(),
                Text(
                  '${toFaDigits((progress * 100).toStringAsFixed(0))}٪',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.pill),
              child: LinearProgressIndicator(
                value: progress == 0 ? null : progress,
                minHeight: 6,
                backgroundColor: AppColors.border,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      );
    }

    return GlassPanel(
      borderRadius: AppRadius.card,
      onTap: enabled ? onTap : null,
      child: SizedBox(
        width: double.infinity,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxl),
          child: Column(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: AppGradients.primary,
                  borderRadius: AppRadius.tileBorder,
                ),
                child: const Icon(Icons.upload_file_rounded, color: Colors.white, size: 26),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: AppSpacing.xs),
              const Text('برای انتخاب فایل ضربه بزنید', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}

class MediaPreview extends StatelessWidget {
  const MediaPreview({
    super.key,
    required this.media,
    this.onRemove,
    this.readOnly = false,
  });

  final FamilyMediaRef media;
  final VoidCallback? onRemove;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    final ready = media.isReady;
    final statusColor = ready ? AppColors.success : AppColors.warning;

    return GlassPanel(
      borderRadius: AppRadius.card,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FamilyMediaView(
            media: media,
            height: media.isAudio ? 88 : 200,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Icon(
                  ready ? Icons.check_circle_rounded : Icons.hourglass_top_rounded,
                  color: statusColor,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        media.originalFilename ?? 'رسانه',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${media.status} · ${formatBytes(media.size)}',
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                if (!readOnly && onRemove != null)
                  IconButton(
                    onPressed: onRemove,
                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
