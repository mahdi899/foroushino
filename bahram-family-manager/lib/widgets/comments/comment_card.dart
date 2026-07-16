import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

typedef CommentAction = VoidCallback;

class CommentCard extends StatelessWidget {
  const CommentCard({
    super.key,
    required this.comment,
    required this.onApprove,
    required this.onReject,
    required this.onToggleImportant,
    required this.onTogglePulse,
    required this.onReply,
  });

  final FamilyCommentModel comment;
  final CommentAction onApprove;
  final CommentAction onReject;
  final CommentAction onToggleImportant;
  final CommentAction onTogglePulse;
  final CommentAction onReply;

  Color get _accentColor {
    if (comment.status == 'pending') return AppColors.warning;
    if (comment.status == 'rejected') return AppColors.error;
    if (comment.isImportant) return AppColors.gold;
    if (comment.inPulse) return AppColors.success;
    return AppColors.primary;
  }

  Color get _riskColor {
    final score = comment.riskScore ?? 0;
    if (score >= 0.6) return AppColors.error;
    if (score >= 0.3) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;
    final muted = scheme.onSurface.withValues(alpha: 0.65);
    final subtle = scheme.onSurface.withValues(alpha: 0.45);
    final softFill = isDark ? AppColors.surfaceSoftDark : AppColors.surfaceSoft;

    return GlassPanel(
      borderRadius: 20,
      blur: AppGlass.panelBlur,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 4,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [_accentColor, _accentColor.withValues(alpha: 0.4)]),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Avatar(name: comment.userName),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  comment.userName ?? 'کاربر',
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                ),
                              ),
                              Text(
                                formatDateTime(comment.createdAt),
                                style: TextStyle(color: subtle, fontSize: 11),
                              ),
                            ],
                          ),
                          if (comment.familyInternalName != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              comment.familyInternalName!,
                              style: TextStyle(color: muted, fontSize: 12),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: softFill,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: scheme.outline.withValues(alpha: 0.45)),
                  ),
                  child: Text(
                    comment.body,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.75),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: [
                    if (comment.riskScore != null)
                      StatusChip(
                        label: 'ریسک ${faPercent((comment.riskScore ?? 0) * 100)}',
                        color: _riskColor,
                        icon: Icons.shield_rounded,
                      ),
                    if (comment.topic != null && comment.topic!.isNotEmpty)
                      StatusChip(label: comment.topic!, color: AppColors.primary, icon: Icons.label_rounded),
                    if (comment.isImportant)
                      const StatusChip(label: 'مهم', color: AppColors.gold, icon: Icons.star_rounded),
                    if (comment.inPulse)
                      const StatusChip(label: 'پالس', color: AppColors.success, icon: Icons.sensors_rounded),
                    if (comment.status == 'rejected' && comment.rejectionReason != null)
                      StatusChip(
                        label: labelOf(rejectionReasonLabels, comment.rejectionReason!),
                        color: AppColors.error,
                        icon: Icons.block_rounded,
                      ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(AppSpacing.sm, AppSpacing.sm, AppSpacing.sm, AppSpacing.md),
            decoration: BoxDecoration(
              color: softFill.withValues(alpha: 0.65),
              border: Border(top: BorderSide(color: scheme.outline.withValues(alpha: 0.45))),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  if (comment.status != 'approved')
                    _ActionChip(icon: Icons.check_rounded, label: 'تأیید', color: AppColors.success, onTap: onApprove),
                  if (comment.status != 'rejected')
                    _ActionChip(icon: Icons.close_rounded, label: 'رد', color: AppColors.error, onTap: onReject),
                  _ActionChip(
                    icon: comment.isImportant ? Icons.star_rounded : Icons.star_outline_rounded,
                    label: comment.isImportant ? 'حذف مهم' : 'مهم',
                    color: AppColors.gold,
                    onTap: onToggleImportant,
                  ),
                  if (comment.status == 'approved')
                    _ActionChip(
                      icon: Icons.sensors_rounded,
                      label: comment.inPulse ? 'حذف پالس' : 'پالس',
                      color: AppColors.accent,
                      onTap: onTogglePulse,
                    ),
                  _ActionChip(icon: Icons.reply_rounded, label: 'پاسخ', color: AppColors.primary, onTap: onReply),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({this.name});

  final String? name;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        gradient: AppGradients.iconShell(active: true),
        borderRadius: BorderRadius.circular(13),
      ),
      alignment: Alignment.center,
      child: Text(
        name?.isNotEmpty == true ? name!.substring(0, 1) : 'ک',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Material(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 6),
                Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
