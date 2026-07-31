import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/widgets/media/media_upload_phase.dart';

/// Gray haze fill + green success border for media thumbnails during upload pipeline.
class MediaUploadProgressOverlay extends StatefulWidget {
  const MediaUploadProgressOverlay({
    super.key,
    required this.phase,
    required this.progress,
    required this.child,
    this.borderRadius = const BorderRadius.all(Radius.circular(14)),
    this.onRetry,
  });

  final MediaUploadPhase phase;
  /// 0–1 transport / pipeline progress (used while [phase] is uploading or finalizing).
  final double progress;
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
        return 0.95 + (widget.progress.clamp(0, 1) * 0.04);
      case MediaUploadPhase.processing:
        return 0.98;
    }
  }

  @override
  Widget build(BuildContext context) {
    final phase = widget.phase;
    final fill = _overlayFillHeight();
    final showOverlay = phase.showsProgressOverlay;
    final isReady = phase == MediaUploadPhase.ready;
    final isFailed = phase == MediaUploadPhase.failed;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        borderRadius: widget.borderRadius,
        border: Border.all(
          color: isReady
              ? AppColors.success
              : isFailed
                  ? AppColors.error
                  : Colors.transparent,
          width: isReady || isFailed ? 2.5 : 0,
        ),
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
                        if (phase == MediaUploadPhase.uploading && fill > 0.05)
                          Align(
                            alignment: Alignment.bottomCenter,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                toFaDigits((fill * 100).round().toString()) + '٪',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
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
            if (isReady)
              PositionedDirectional(
                top: 6,
                start: 6,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.success.withValues(alpha: 0.4),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.check_rounded, size: 14, color: Colors.white),
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
