import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';

/// Gray haze fill + green glow halo for media thumbnails during upload pipeline.
class MediaUploadProgressOverlay extends StatefulWidget {
  const MediaUploadProgressOverlay({
    super.key,
    required this.phase,
    required this.progress,
    required this.child,
    this.sentBytes = 0,
    this.totalBytes = 0,
    this.borderRadius = const BorderRadius.all(Radius.circular(14)),
    this.onRetry,
  });

  final MediaUploadPhase phase;
  /// 0–1 transport / pipeline progress (used while [phase] is uploading or finalizing).
  final double progress;
  final int sentBytes;
  final int totalBytes;
  final Widget child;
  final BorderRadius borderRadius;
  final VoidCallback? onRetry;

  @override
  State<MediaUploadProgressOverlay> createState() => _MediaUploadProgressOverlayState();
}

class _MediaUploadProgressOverlayState extends State<MediaUploadProgressOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    if (widget.phase == MediaUploadPhase.processing) {
      _pulseCtrl.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(MediaUploadProgressOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.phase == MediaUploadPhase.processing) {
      if (!_pulseCtrl.isAnimating) _pulseCtrl.repeat(reverse: true);
    } else {
      _pulseCtrl.stop();
      _pulseCtrl.value = 0;
    }
    if (widget.phase == MediaUploadPhase.ready && oldWidget.phase != MediaUploadPhase.ready) {
      _pulseCtrl.stop();
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  double _overlayFillHeight() {
    switch (widget.phase) {
      case MediaUploadPhase.idle:
      case MediaUploadPhase.ready:
      case MediaUploadPhase.failed:
        return 0;
      case MediaUploadPhase.uploading:
        return widget.progress.clamp(0, 1);
      case MediaUploadPhase.finalizing:
        return 1;
      case MediaUploadPhase.processing:
        return 0.98;
    }
  }

  String? _progressLabel() {
    final total = widget.totalBytes;
    if (total <= 0) {
      if (widget.phase == MediaUploadPhase.uploading && widget.progress > 0) {
        return '${toFaDigits((widget.progress * 100).round().toString())}٪';
      }
      return null;
    }

    final sent = widget.sentBytes.clamp(0, total);
    final percent = widget.phase == MediaUploadPhase.finalizing
        ? 100
        : (widget.progress * 100).round().clamp(0, 100);

    return '${toFaDigits(percent.toString())}٪ · ${formatBytes(sent)} / ${formatBytes(total)}';
  }

  @override
  Widget build(BuildContext context) {
    final phase = widget.phase;
    final fill = _overlayFillHeight();
    final showOverlay = phase.showsProgressOverlay;
    final isReady = phase == MediaUploadPhase.ready;
    final isFailed = phase == MediaUploadPhase.failed;
    final progressLabel = _progressLabel();

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        borderRadius: widget.borderRadius,
        boxShadow: isReady
            ? [
                BoxShadow(
                  color: AppColors.success.withValues(alpha: 0.35),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ]
            : isFailed
                ? [
                    BoxShadow(
                      color: AppColors.error.withValues(alpha: 0.25),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
      ),
      child: ClipRRect(
        borderRadius: widget.borderRadius,
        child: Stack(
          fit: StackFit.passthrough,
          children: [
            widget.child,
            if (showOverlay)
              Positioned.fill(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final h = constraints.maxHeight;
                    final overlayHeight = h * fill;
                    final pulseAlpha = phase == MediaUploadPhase.processing
                        ? 0.35 + (_pulseCtrl.value * 0.15)
                        : 0.45;

                    return Stack(
                      fit: StackFit.expand,
                      children: [
                        Align(
                          alignment: Alignment.bottomCenter,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            curve: Curves.easeOut,
                            height: overlayHeight,
                            width: constraints.maxWidth,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade700.withValues(alpha: pulseAlpha),
                            ),
                          ),
                        ),
                        if (progressLabel != null && fill > 0.02)
                          Align(
                            alignment: Alignment.bottomCenter,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8, left: 8, right: 8),
                              child: Text(
                                progressLabel,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                  shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
                                ),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            if (isFailed && widget.onRetry != null)
              Positioned.fill(
                child: Material(
                  color: Colors.black45,
                  child: Center(
                    child: TextButton.icon(
                      onPressed: widget.onRetry,
                      icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                      label: const Text(
                        'تلاش مجدد',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
