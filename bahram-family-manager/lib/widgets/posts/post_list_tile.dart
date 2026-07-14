import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';

class PostListTile extends StatelessWidget {
  const PostListTile({
    super.key,
    required this.post,
    required this.onTap,
  });

  final FamilyPostModel post;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final mediaBlock = post.primaryMediaBlock;
    final text = post.textPreview ?? post.preview;
    final isImportant = post.isImportant;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: isImportant ? AppColors.goldSoft.withValues(alpha: 0.45) : AppColors.surface,
            border: Border.all(
              color: isImportant ? AppColors.gold.withValues(alpha: 0.35) : AppColors.border,
            ),
            boxShadow: AppShadows.soft,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
                child: Row(
                  children: [
                    _AuthorAvatar(name: post.authorName),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(post.authorName ?? 'بهرام', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          Text(
                            formatDateTime(post.publishedAt ?? post.createdAt),
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    StatusChip(
                      label: labelOf(postTypeLabels, post.type),
                      color: AppColors.primary,
                      icon: postTypeIcon(post.type),
                    ),
                  ],
                ),
              ),
              if (mediaBlock?.media != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FamilyMediaView(media: mediaBlock!.media!, height: 200),
                ),
              if (text.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: Text(
                    text,
                    maxLines: mediaBlock == null ? 4 : 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.7),
                  ),
                ),
              ],
              if (isImportant || post.actions.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
                  child: Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      if (isImportant)
                        const StatusChip(label: 'مهم', color: AppColors.gold, icon: Icons.star_rounded),
                      if (post.actions.isNotEmpty)
                        StatusChip(
                          label: post.actions.first.prompt,
                          color: AppColors.accent,
                          icon: Icons.ads_click_rounded,
                        ),
                    ],
                  ),
                ),
              ] else
                const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthorAvatar extends StatelessWidget {
  const _AuthorAvatar({this.name});

  final String? name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        gradient: AppGradients.primary,
        borderRadius: BorderRadius.circular(14),
        boxShadow: AppShadows.primaryGlow,
      ),
      alignment: Alignment.center,
      child: Text(
        name?.isNotEmpty == true ? name!.substring(0, 1) : 'ب',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
      ),
    );
  }
}

// StatCard stays in this file for home/analytics
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String title;
  final int value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.soft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [color.withValues(alpha: 0.85), color]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          Text(toFaDigits(value.toString()), style: Theme.of(context).textTheme.headlineSmall),
          Text(title, style: Theme.of(context).textTheme.labelMedium),
        ],
      ),
    );
  }
}

IconData postTypeIcon(String type) => switch (type) {
      'text' => Icons.article_rounded,
      'voice' => Icons.mic_rounded,
      'video' => Icons.videocam_rounded,
      'image' => Icons.image_rounded,
      _ => Icons.campaign_rounded,
    };

extension FamilyPostModelX on FamilyPostModel {
  FamilyPostBlockModel? get primaryMediaBlock {
    for (final block in blocks) {
      if (block.media != null && block.type != 'text') return block;
    }
    return null;
  }

  String? get textPreview {
    final textBlock = blocks.firstWhereOrNull((b) => b.type == 'text');
    if (textBlock?.textContent != null && textBlock!.textContent!.isNotEmpty) {
      return textBlock.textContent;
    }
    return null;
  }
}
