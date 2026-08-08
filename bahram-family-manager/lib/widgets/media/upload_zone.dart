import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_progress_overlay.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class UploadZone extends StatelessWidget {
  const UploadZone({
    super.key,
    required this.label,
    required this.onTap,
    this.uploading = false,
    this.progress = 0,
    this.sentBytes = 0,
    this.totalBytes = 0,
    this.phase = MediaUploadPhase.uploading,
    this.hostStatus,
    this.pollAttempt,
    this.statusDetail,
    this.enabled = true,
    this.onCancel,
  });

  final String label;
  final VoidCallback? onTap;
  final bool uploading;
  final double progress;
  final int sentBytes;
  final int totalBytes;
  final MediaUploadPhase phase;
  final String? hostStatus;
  final int? pollAttempt;
  final String? statusDetail;
  final bool enabled;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;
    final muted = context.appTextMuted;

    if (uploading) {
      return MediaUploadProgressOverlay(
        phase: phase,
        progress: progress,
        sentBytes: sentBytes,
        totalBytes: totalBytes,
        hostStatus: hostStatus,
        pollAttempt: pollAttempt,
        statusDetail: statusDetail,
        borderRadius: AppRadius.cardBorder,
        onCancel: onCancel,
        child: GlassPanel(
          borderRadius: AppRadius.card,
          blur: 0,
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxl),
          child: SizedBox(
            width: double.infinity,
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
                Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface)),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  phase.statusLabel(
                    phase.overallPercent(progress),
                    hostStatus: hostStatus,
                    pollAttempt: pollAttempt,
                    statusDetail: statusDetail,
                  ),
                  textAlign: TextAlign.center,
                  style: TextStyle(color: muted, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return GlassPanel(
      borderRadius: AppRadius.card,
      blur: 0,
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
              Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: scheme.onSurface)),
              const SizedBox(height: AppSpacing.xs),
              Text('برای انتخاب فایل ضربه بزنید', style: TextStyle(color: muted, fontSize: 13)),
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
    final muted = context.appTextMuted;

    return MediaUploadProgressOverlay(
      phase: ready ? MediaUploadPhase.ready : MediaUploadPhase.processing,
      progress: ready ? 1 : 0,
      sentBytes: media.size ?? 0,
      totalBytes: media.size ?? 0,
      borderRadius: AppRadius.cardBorder,
      child: GlassPanel(
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
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          media.originalFilename ?? 'رسانه',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: context.appScheme.onSurface),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${media.status} · ${formatBytes(media.size)}',
                          style: TextStyle(color: muted, fontSize: 12),
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
      ),
    );
  }
}
