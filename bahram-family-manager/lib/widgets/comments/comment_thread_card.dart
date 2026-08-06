import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class CommentThreadCard extends StatelessWidget {
  const CommentThreadCard({
    super.key,
    required this.thread,
    required this.onViewComments,
  });

  final CommentThreadModel thread;
  final VoidCallback onViewComments;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.65);
    final typeLabel = thread.postType != null ? labelOf(postTypeLabels, thread.postType!) : 'پست';
    final preview = (thread.postPreview?.trim().isNotEmpty == true)
        ? thread.postPreview!.trim()
        : 'پست $typeLabel #${toFaDigits(thread.postId.toString())}';

    return GlassPanel(
      borderRadius: 20,
      blur: 0,
      padding: EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onViewComments,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: AppGradients.iconShell(active: true),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.article_outlined, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            typeLabel,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                          if (thread.latestCommentAt != null)
                            Text(
                              formatDateTime(thread.latestCommentAt),
                              style: TextStyle(color: muted, fontSize: 11),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  preview,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.55),
                ),
                if (thread.latestCommentPreview != null &&
                    thread.latestCommentPreview!.trim().isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'آخرین نظر: ${thread.latestCommentPreview!.trim()}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: muted, fontSize: 12, height: 1.45),
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    StatusChip(
                      label: '${toFaDigits(thread.matchingCount.toString())} نظر',
                      color: AppColors.primary,
                      icon: Icons.forum_outlined,
                    ),
                    if (thread.pendingCount > 0)
                      StatusChip(
                        label: '${toFaDigits(thread.pendingCount.toString())} در انتظار',
                        color: AppColors.warning,
                        icon: Icons.hourglass_top_rounded,
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: FilledButton.tonalIcon(
                    onPressed: onViewComments,
                    icon: const Icon(Icons.visibility_rounded, size: 18),
                    label: const Text('مشاهده کامنت‌ها'),
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
