import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/core/utils/reply_tag.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

/// Text-only Bahram reply to a family comment (voice replies removed from manager UI).
Future<bool?> showCommentReplySheet({
  required BuildContext context,
  required FamilyCommentModel comment,
}) {
  return showAppBottomSheet<bool>(
    context: context,
    title: 'پاسخ بهرام به نظر',
    subtitle: comment.userName,
    // Short text-only form — non-draggable sheet + viewInsets padding clears nav/keyboard.
    scrollable: false,
    child: _ReplySheetForm(comment: comment),
  );
}

class _ReplySheetForm extends StatefulWidget {
  const _ReplySheetForm({required this.comment});

  final FamilyCommentModel comment;

  @override
  State<_ReplySheetForm> createState() => _ReplySheetFormState();
}

class _ReplySheetFormState extends State<_ReplySheetForm> {
  final _textCtrl = TextEditingController();
  var _sending = false;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty) {
      showAppSnackBar(context, 'متن پاسخ را وارد کنید.');
      return;
    }

    final tagged = encodeReplyBody(widget.comment.userName, text);

    setState(() => _sending = true);
    try {
      await context.read<AppState>().manager.replyToComment(
            commentId: widget.comment.id,
            text: tagged,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.35)),
          ),
          child: Text(
            widget.comment.body,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.textMuted, height: 1.55),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        TextField(
          controller: _textCtrl,
          maxLines: 5,
          minLines: 3,
          textInputAction: TextInputAction.newline,
          decoration: const InputDecoration(
            labelText: 'متن پاسخ',
            hintText: 'پاسخ بهرام را بنویسید…',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(label: 'ارسال پاسخ', loading: _sending, onPressed: _send),
      ],
    );
  }
}
