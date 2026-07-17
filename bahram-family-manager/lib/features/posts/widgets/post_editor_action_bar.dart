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

  bool get _hasMoreActions =>
      onPublish != null ||
      onRepublish != null ||
      onDelete != null ||
      onArchive != null ||
      onRecover != null ||
      onTogglePin != null;

  Future<void> _openMoreSheet(BuildContext context) async {
    if (!_hasMoreActions || saving) return;

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        final scheme = Theme.of(sheetContext).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
            child: GlassPanel(
              borderRadius: 20,
              blur: 0,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: AppSpacing.sm, top: AppSpacing.xs),
                      decoration: BoxDecoration(
                        color: scheme.outline.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                      ),
                    ),
                  ),
                  if (onPublish != null)
                    _MoreTile(
                      icon: Icons.bolt_rounded,
                      iconColor: AppColors.primary,
                      title: 'انتشار لحظه‌ای',
                      subtitle: post == null
                          ? 'ذخیره و انتشار فوری پست در فید خانواده'
                          : 'انتشار همین پیش‌نویس در فید خانواده',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        onPublish!();
                      },
                    ),
                  if (onRepublish != null)
                    _MoreTile(
                      icon: Icons.refresh_rounded,
                      title: post?.isArchived == true ? 'انتشار مجدد از آرشیو' : 'انتشار مجدد',
                      subtitle: 'پست دوباره در بالای فید قرار می‌گیرد',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        onRepublish!();
                      },
                    ),
                  if (onTogglePin != null)
                    _MoreTile(
                      icon: post!.isPinned ? Icons.push_pin_outlined : Icons.push_pin_rounded,
                      title: post!.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        onTogglePin!();
                      },
                    ),
                  if (onArchive != null)
                    _MoreTile(
                      icon: Icons.archive_rounded,
                      title: 'آرشیو',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        onArchive!();
                      },
                    ),
                  if (onRecover != null)
                    _MoreTile(
                      icon: Icons.unarchive_rounded,
                      title: 'بازیابی بدون انتشار مجدد',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        onRecover!();
                      },
                    ),
                  if (onDelete != null)
                    _MoreTile(
                      icon: Icons.delete_outline_rounded,
                      iconColor: AppColors.error,
                      title: 'حذف',
                      titleColor: AppColors.error,
                      onTap: () {
                        Navigator.pop(sheetContext);
                        onDelete!();
                      },
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

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
          child: Row(
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
              if (_hasMoreActions) ...[
                const SizedBox(width: AppSpacing.sm),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: saving ? null : () => _openMoreSheet(context),
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: Icon(
                        Icons.more_horiz_rounded,
                        color: scheme.onSurface.withValues(alpha: saving ? 0.35 : 0.75),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  const _MoreTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.iconColor,
    this.titleColor,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final Color? iconColor;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: Icon(icon, color: iconColor ?? scheme.primary),
      title: Text(
        title,
        style: TextStyle(fontWeight: FontWeight.w700, color: titleColor),
      ),
      subtitle: subtitle == null
          ? null
          : Text(subtitle!, style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.6))),
      onTap: onTap,
    );
  }
}

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
