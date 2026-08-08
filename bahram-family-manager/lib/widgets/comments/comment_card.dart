import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/utils/reply_tag.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

typedef CommentAction = VoidCallback;

List<FamilyCommentModel> _sortedReplies(List<FamilyCommentModel> replies) {
  final sorted = [...replies];
  sorted.sort((a, b) {
    final bahram = (b.isBahramReply ? 1 : 0) - (a.isBahramReply ? 1 : 0);
    if (bahram != 0) return bahram;
    return a.id.compareTo(b.id);
  });
  return sorted;
}

Widget _replyBody(String body, TextStyle? base, Color chipFg, Color chipBg) {
  final parsed = parseReplyBody(body);
  final text = Text(parsed.body, style: base);
  if (parsed.tag == null || parsed.tag!.isEmpty) return text;

  return Text.rich(
    TextSpan(
      children: [
        WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: Container(
            margin: const EdgeInsets.only(left: 6),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(
              color: chipBg,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              parsed.tag!,
              style: TextStyle(
                fontSize: (base?.fontSize ?? 14) * 0.85,
                fontWeight: FontWeight.w800,
                color: chipFg,
                height: 1.35,
              ),
            ),
          ),
        ),
        TextSpan(text: parsed.body, style: base),
      ],
    ),
  );
}

class CommentCard extends StatelessWidget {
  const CommentCard({
    super.key,
    required this.comment,
    required this.onApprove,
    required this.onReject,
    required this.onToggleImportant,
    required this.onReply,
    this.onApproveReply,
    this.onRejectReply,
    this.selectable = false,
    this.selected = false,
    this.onSelectedChanged,
    this.showFamily = true,
  });

  final FamilyCommentModel comment;
  final CommentAction onApprove;
  final CommentAction onReject;
  final CommentAction onToggleImportant;
  final CommentAction onReply;
  final ValueChanged<FamilyCommentModel>? onApproveReply;
  final ValueChanged<FamilyCommentModel>? onRejectReply;
  final bool selectable;
  final bool selected;
  final ValueChanged<bool>? onSelectedChanged;
  final bool showFamily;

  Color get _accentColor {
    if (comment.status == 'pending') return AppColors.warning;
    if (comment.status == 'rejected') return AppColors.error;
    if (comment.isImportant) return const Color(0xFFDC2626);
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
    final importantBorder = const Color(0xFFDC2626);
    final replies = _sortedReplies(comment.replies);

    return GlassPanel(
      borderRadius: 20,
      blur: 0,
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
                    if (selectable) ...[
                      Checkbox(
                        value: selected,
                        onChanged: (v) => onSelectedChanged?.call(v ?? false),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                    ],
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
                          if (showFamily && comment.familyInternalName != null) ...[
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
                    border: Border.all(
                      color: comment.isImportant
                          ? importantBorder
                          : scheme.outline.withValues(alpha: 0.45),
                      width: comment.isImportant ? 1.5 : 1,
                    ),
                  ),
                  child: _replyBody(
                    comment.body,
                    Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.75),
                    AppColors.primary,
                    AppColors.primary.withValues(alpha: 0.12),
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
                      const StatusChip(label: 'مهم', color: Color(0xFFDC2626), icon: Icons.star_rounded),
                    if (comment.isBahramReply)
                      const StatusChip(label: 'پاسخ بهرام', color: AppColors.primary, icon: Icons.verified_rounded),
                    if (comment.status == 'rejected' && comment.rejectionReason != null)
                      StatusChip(
                        label: labelOf(rejectionReasonLabels, comment.rejectionReason!),
                        color: AppColors.error,
                        icon: Icons.block_rounded,
                      ),
                  ],
                ),
                if (replies.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  ...replies.map(
                    (reply) => Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.lg, bottom: AppSpacing.sm),
                      child: _ThreadReplyBubble(
                        reply: reply,
                        onApprove: onApproveReply == null ? null : () => onApproveReply!(reply),
                        onReject: onRejectReply == null ? null : () => onRejectReply!(reply),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (!comment.isBahramReply)
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
                      color: const Color(0xFFDC2626),
                      onTap: onToggleImportant,
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

class _ThreadReplyBubble extends StatelessWidget {
  const _ThreadReplyBubble({
    required this.reply,
    this.onApprove,
    this.onReject,
  });

  final FamilyCommentModel reply;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final softFill = scheme.brightness == Brightness.dark
        ? AppColors.surfaceSoftDark
        : AppColors.surfaceSoft;
    final isBahram = reply.isBahramReply;
    final borderColor = isBahram
        ? AppColors.primary.withValues(alpha: 0.4)
        : scheme.outline.withValues(alpha: 0.4);
    final nameColor = isBahram ? AppColors.primary : scheme.onSurface;
    final canModerate = !isBahram && (onApprove != null || onReject != null);
    final showApprove = canModerate && reply.status != 'approved' && onApprove != null;
    final showReject = canModerate && reply.status != 'rejected' && onReject != null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: softFill,
        borderRadius: BorderRadius.circular(14),
        border: Border(
          right: BorderSide(color: isBahram ? AppColors.primary : scheme.outline.withValues(alpha: 0.55), width: 3),
          top: BorderSide(color: borderColor),
          left: BorderSide(color: borderColor),
          bottom: BorderSide(color: borderColor),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                reply.userName ?? (isBahram ? 'بهرام' : 'کاربر'),
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: nameColor),
              ),
              if (isBahram) ...[
                const SizedBox(width: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'بهرام',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                ),
              ],
              if (reply.status == 'pending') ...[
                const SizedBox(width: AppSpacing.sm),
                const StatusChip(label: 'در انتظار', color: AppColors.warning, icon: Icons.hourglass_top_rounded),
              ],
              if (reply.status == 'rejected') ...[
                const SizedBox(width: AppSpacing.sm),
                const StatusChip(label: 'رد‌شده', color: AppColors.error, icon: Icons.cancel_outlined),
              ],
              const Spacer(),
              Text(
                formatDateTime(reply.createdAt),
                style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.45), fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          _replyBody(
            reply.body,
            Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.6),
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.12),
          ),
          if (showApprove || showReject) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.xs,
              children: [
                if (showApprove)
                  _ActionChip(icon: Icons.check_rounded, label: 'تأیید', color: AppColors.success, onTap: onApprove!),
                if (showReject)
                  _ActionChip(icon: Icons.close_rounded, label: 'رد', color: AppColors.error, onTap: onReject!),
              ],
            ),
          ],
        ],
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
