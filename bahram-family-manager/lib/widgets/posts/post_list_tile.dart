import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class PostListTile extends StatelessWidget {
  const PostListTile({
    super.key,
    required this.post,
    required this.onTap,
    this.onPinToggle,
    this.onEdit,
    this.onDelete,
    this.onRepublish,
    this.onPublish,
    this.onRecover,
    this.selectable = false,
    this.selected = false,
    this.onSelectedChanged,
    this.onLongPress,
  });

  final FamilyPostModel post;
  final VoidCallback onTap;
  final VoidCallback? onPinToggle;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onRepublish;
  final VoidCallback? onPublish;
  final VoidCallback? onRecover;
  final bool selectable;
  final bool selected;
  final ValueChanged<bool>? onSelectedChanged;
  final VoidCallback? onLongPress;

  bool get _hasMenu => onEdit != null || onDelete != null || onRepublish != null || onPublish != null || onRecover != null;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.6);
    final mediaBlock = post.primaryMediaBlock;
    final text = post.textPreview ?? post.preview;
    final isImportant = post.isImportant;

    return GlassPanel(
      borderRadius: 20,
      blur: 0,
      padding: EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: selectable
              ? () => onSelectedChanged?.call(!selected)
              : onTap,
          onLongPress: selectable
              ? null
              : (onLongPress ?? onTap),
          borderRadius: BorderRadius.circular(20),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: selected
                  ? Border.all(color: scheme.primary, width: 2)
                  : null,
            ),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.md),
                child: Row(
                  children: [
                    if (selectable) ...[
                      Checkbox(
                        value: selected,
                        onChanged: (value) => onSelectedChanged?.call(value ?? false),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                    ],
                    _AuthorAvatar(name: post.authorName),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(post.authorName ?? 'بهرام', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          Text(
                            formatDateTime(post.publishedAt ?? post.createdAt),
                            style: TextStyle(color: muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    StatusChip(
                      label: labelOf(postTypeLabels, post.type),
                      color: AppColors.primary,
                      icon: postTypeIcon(post.type),
                    ),
                    if (onPinToggle != null) ...[
                      const SizedBox(width: AppSpacing.xs),
                      IconButton(
                        tooltip: post.isPinned ? 'برداشتن سنجاق' : 'سنجاق',
                        onPressed: onPinToggle,
                        icon: Icon(
                          post.isPinned ? Icons.push_pin : Icons.push_pin_outlined,
                          color: post.isPinned ? scheme.primary : muted,
                          size: 20,
                        ),
                      ),
                    ],
                    if (_hasMenu && !selectable)
                      PopupMenuButton<_PostMenuAction>(
                        tooltip: 'عملیات پست',
                        icon: Icon(Icons.more_vert_rounded, color: muted, size: 22),
                        onSelected: (action) => switch (action) {
                          _PostMenuAction.edit => onEdit?.call(),
                          _PostMenuAction.publish => onPublish?.call(),
                          _PostMenuAction.republish => onRepublish?.call(),
                          _PostMenuAction.delete => onDelete?.call(),
                          _PostMenuAction.recover => onRecover?.call(),
                        },
                        itemBuilder: (context) => [
                          if (onEdit != null)
                            const PopupMenuItem(
                              value: _PostMenuAction.edit,
                              child: ListTile(
                                leading: Icon(Icons.edit_rounded),
                                title: Text('ویرایش'),
                                contentPadding: EdgeInsets.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          if (onPublish != null)
                            const PopupMenuItem(
                              value: _PostMenuAction.publish,
                              child: ListTile(
                                leading: Icon(Icons.publish_rounded),
                                title: Text('انتشار'),
                                contentPadding: EdgeInsets.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          if (onRepublish != null)
                            const PopupMenuItem(
                              value: _PostMenuAction.republish,
                              child: ListTile(
                                leading: Icon(Icons.refresh_rounded),
                                title: Text('انتشار مجدد'),
                                contentPadding: EdgeInsets.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          if (onRecover != null)
                            const PopupMenuItem(
                              value: _PostMenuAction.recover,
                              child: ListTile(
                                leading: Icon(Icons.unarchive_rounded),
                                title: Text('بازیابی از آرشیو'),
                                contentPadding: EdgeInsets.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          if (onDelete != null)
                            const PopupMenuItem(
                              value: _PostMenuAction.delete,
                              child: ListTile(
                                leading: Icon(Icons.delete_outline_rounded, color: AppColors.error),
                                title: Text('حذف', style: TextStyle(color: AppColors.error)),
                                contentPadding: EdgeInsets.zero,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                        ],
                      ),
                  ],
                ),
              ),
              if (mediaBlock?.media != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                  child: FamilyMediaView(media: mediaBlock!.media!, height: 200, previewOnly: true),
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
              if (isImportant || post.actions.isNotEmpty || post.isPinned) ...[
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
                  child: Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      StatusChip(
                        label: post.channelLabel,
                        color: AppColors.accent,
                        icon: Icons.campaign_rounded,
                      ),
                      if (isImportant)
                        const StatusChip(label: 'مهم', color: AppColors.gold, icon: Icons.star_rounded),
                      if (post.isPinned)
                        const StatusChip(label: 'سنجاق', color: AppColors.primary, icon: Icons.push_pin_rounded),
                      if (post.actions.isNotEmpty)
                        StatusChip(
                          label: post.actions.first.prompt,
                          color: AppColors.primaryDark,
                          icon: Icons.ads_click_rounded,
                        ),
                    ],
                  ),
                ),
              ] else ...[
                const SizedBox(height: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
                  child: StatusChip(
                    label: post.channelLabel,
                    color: AppColors.accent,
                    icon: Icons.campaign_rounded,
                  ),
                ),
              ],
            ],
          ),
          ),
        ),
      ),
    );
  }
}

enum _PostMenuAction { edit, publish, republish, recover, delete }

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
    this.compact = false,
  });

  final String title;
  final int value;
  final IconData icon;
  final Color color;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final iconSize = compact ? 28.0 : 34.0;
    final glyphSize = compact ? 15.0 : 18.0;

    return GlassPanel(
      borderRadius: compact ? 16 : 20,
      blur: AppGlass.panelBlur,
      padding: EdgeInsets.all(compact ? AppSpacing.sm + 2 : AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: iconSize,
                height: iconSize,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [color.withValues(alpha: 0.85), color]),
                  borderRadius: BorderRadius.circular(compact ? 8 : 10),
                ),
                child: Icon(icon, color: Colors.white, size: glyphSize),
              ),
              if (compact) ...[
                const Spacer(),
                Text(
                  toFaDigits(value.toString()),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
              ],
            ],
          ),
          if (!compact)
            Text(
              toFaDigits(value.toString()),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontSize: compact ? 11 : null,
                ),
          ),
        ],
      ),
    );
  }
}

/// Fixed-height responsive grid for dashboard stat cards (avoids GridView overflow).
class StatCardGrid extends StatelessWidget {
  const StatCardGrid({
    super.key,
    required this.children,
    this.compact = false,
  });

  final List<Widget> children;
  final bool compact;

  static const double cardHeight = 128;

  @override
  Widget build(BuildContext context) {
    // Mobile stays at 2 columns so titles/values aren't crushed.
    final columns = AppBreakpoints.gridColumns(context, mobile: 2, tablet: 2, desktop: 4);
    return LayoutBuilder(
      builder: (context, constraints) {
        final spacing = (compact ? AppSpacing.sm : AppSpacing.md).toDouble();
        final itemWidth = (constraints.maxWidth - spacing * (columns - 1)) / columns;
        final height = AppBreakpoints.isDesktop(context)
            ? cardHeight
            : (compact ? 92.0 : 120.0);
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final child in children)
              SizedBox(width: itemWidth, height: height, child: child),
          ],
        );
      },
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
