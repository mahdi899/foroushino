import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/posts/post_list_tile.dart';
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
    final title = (thread.postPreview?.trim().isNotEmpty == true)
        ? thread.postPreview!.trim()
        : 'پست $typeLabel #${toFaDigits(thread.postId.toString())}';
    final publishedLabel = thread.publishedAt != null
        ? 'انتشار: ${formatDateTime(thread.publishedAt)}'
        : null;

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
                      child: Icon(postTypeIcon(thread.postType ?? 'text'), color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, height: 1.35),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            publishedLabel ?? 'بدون تاریخ انتشار',
                            style: TextStyle(color: muted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    if (thread.unreadCount > 0) _UnreadBadge(count: thread.unreadCount),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    StatusChip(
                      label: typeLabel,
                      color: AppColors.primary,
                      icon: postTypeIcon(thread.postType ?? 'text'),
                    ),
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
                    if (thread.unreadCount > 0)
                      StatusChip(
                        label: '${toFaDigits(thread.unreadCount.toString())} خوانده‌نشده',
                        color: AppColors.error,
                        icon: Icons.mark_email_unread_rounded,
                      ),
                  ],
                ),
                if (thread.latestCommentPreview != null &&
                    thread.latestCommentPreview!.trim().isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'آخرین نظر: ${thread.latestCommentPreview!.trim()}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: muted, fontSize: 12, height: 1.45),
                  ),
                ],
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

class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '۹۹+' : toFaDigits(count.toString());
    return Container(
      constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.error,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: AppColors.error.withValues(alpha: 0.28),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          height: 1.1,
        ),
      ),
    );
  }
}
