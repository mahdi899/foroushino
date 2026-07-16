import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class PostEditorActionBar extends StatelessWidget {
  const PostEditorActionBar({
    super.key,
    required this.post,
    required this.saving,
    required this.onSave,
    this.onPublish,
    this.onRepublish,
    this.onDelete,
    this.onArchive,
    this.onRecover,
    this.onTogglePin,
  });

  final FamilyPostModel? post;
  final bool saving;
  final VoidCallback onSave;
  final VoidCallback? onPublish;
  final VoidCallback? onRepublish;
  final VoidCallback? onDelete;
  final VoidCallback? onArchive;
  final VoidCallback? onRecover;
  final VoidCallback? onTogglePin;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.lg),
        child: GlassPanel(
          borderRadius: 22,
          blur: 0,
          padding: const EdgeInsets.all(AppSpacing.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: _GlassActionButton(
                      label: post == null ? 'ذخیره پیش‌نویس' : 'ذخیره',
                      icon: Icons.save_rounded,
                      primary: true,
                      loading: saving,
                      onPressed: saving ? null : onSave,
                    ),
                  ),
                  if (onPublish != null) ...[
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: _GlassActionButton(
                        label: 'انتشار',
                        icon: Icons.send_rounded,
                        onPressed: saving ? null : onPublish,
                      ),
                    ),
                  ],
                  if (onRepublish != null) ...[
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: _GlassActionButton(
                        label: post?.isArchived == true ? 'انتشار مجدد' : 'انتشار مجدد',
                        icon: Icons.refresh_rounded,
                        onPressed: saving ? null : onRepublish,
                      ),
                    ),
                  ],
                  const SizedBox(width: AppSpacing.sm),
                  PopupMenuButton<_PostMoreAction>(
                    tooltip: 'عملیات بیشتر',
                    enabled: !saving,
                    icon: Icon(Icons.more_horiz_rounded, color: scheme.onSurface.withValues(alpha: 0.75)),
                    onSelected: (action) => switch (action) {
                      _PostMoreAction.delete => onDelete?.call(),
                      _PostMoreAction.archive => onArchive?.call(),
                      _PostMoreAction.pin => onTogglePin?.call(),
                      _PostMoreAction.recover => onRecover?.call(),
                    },
                    itemBuilder: (context) => [
                      if (onRecover != null)
                        const PopupMenuItem(
                          value: _PostMoreAction.recover,
                          child: ListTile(
                            leading: Icon(Icons.unarchive_rounded),
                            title: Text('بازیابی بدون انتشار مجدد'),
                            contentPadding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                      if (onTogglePin != null)
                        PopupMenuItem(
                          value: _PostMoreAction.pin,
                          child: ListTile(
                            leading: Icon(post!.isPinned ? Icons.push_pin_outlined : Icons.push_pin_rounded),
                            title: Text(post!.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن'),
                            contentPadding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                      if (onArchive != null)
                        const PopupMenuItem(
                          value: _PostMoreAction.archive,
                          child: ListTile(
                            leading: Icon(Icons.archive_rounded),
                            title: Text('آرشیو'),
                            contentPadding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                      if (onDelete != null)
                        const PopupMenuItem(
                          value: _PostMoreAction.delete,
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
            ],
          ),
        ),
      ),
    );
  }
}

enum _PostMoreAction { delete, archive, pin, recover }

class _GlassActionButton extends StatelessWidget {
  const _GlassActionButton({
    required this.label,
    required this.icon,
    required this.onPressed,
    this.primary = false,
    this.loading = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final bool primary;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final enabled = onPressed != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: primary && enabled ? AppGradients.primary : null,
            color: primary
                ? null
                : scheme.surface.withValues(alpha: enabled ? 0.35 : 0.2),
            border: Border.all(
              color: primary
                  ? Colors.transparent
                  : scheme.outline.withValues(alpha: enabled ? 0.45 : 0.25),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (loading)
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: primary ? Colors.white : scheme.primary,
                  ),
                )
              else
                Icon(icon, size: 18, color: primary ? Colors.white : scheme.primary),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: primary ? Colors.white : scheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
