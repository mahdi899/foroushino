import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class CommentsScreen extends StatefulWidget {
  const CommentsScreen({super.key});

  @override
  State<CommentsScreen> createState() => _CommentsScreenState();
}

class _CommentsScreenState extends State<CommentsScreen> with SingleTickerProviderStateMixin {
  static const _tabs = ['pending', 'approved', 'rejected', 'important', 'unread'];
  static const _tabLabels = {
    'pending': 'در انتظار',
    'approved': 'تأییدشده',
    'rejected': 'رد‌شده',
    'important': 'مهم',
    'unread': 'خوانده‌نشده',
  };

  late final TabController _tabController;
  Future<PaginatedResult<FamilyCommentModel>>? _future;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this)..addListener(_onTabChanged);
    _load();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.listComments(tab: _tabs[_tabController.index]);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _approve(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.approveComment(comment.id);
      _load();
    } catch (e) {
      _show(messageOf(e));
    }
  }

  Future<void> _reject(FamilyCommentModel comment) async {
    final result = await showDialog<({String reason, String note})>(
      context: context,
      builder: (_) => const _RejectDialog(),
    );
    if (result == null) return;

    try {
      await context.read<AppState>().manager.rejectComment(comment.id, reason: result.reason, note: result.note);
      _load();
    } catch (e) {
      _show(messageOf(e));
    }
  }

  Future<void> _toggleImportant(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.toggleImportant(comment.id);
      _load();
    } catch (e) {
      _show(messageOf(e));
    }
  }

  Future<void> _togglePulse(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.togglePulse(comment.id);
      _load();
    } catch (e) {
      _show(messageOf(e));
    }
  }

  Future<void> _reply(FamilyCommentModel comment) async {
    final replied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ReplySheet(comment: comment),
    );
    if (replied == true) _load();
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('نظرات خانواده'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _tabs.map((t) => Tab(text: _tabLabels[t])).toList(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<PaginatedResult<FamilyCommentModel>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [Text(messageOf(snapshot.error!), style: const TextStyle(color: AppColors.error))],
              );
            }

            final comments = snapshot.data!.items;
            if (comments.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: const [Center(child: Text('نظری وجود ندارد.', style: TextStyle(color: AppColors.textMuted)))],
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: comments.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final c = comments[index];
                return _CommentCard(
                  comment: c,
                  onApprove: () => _approve(c),
                  onReject: () => _reject(c),
                  onToggleImportant: () => _toggleImportant(c),
                  onTogglePulse: () => _togglePulse(c),
                  onReply: () => _reply(c),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({
    required this.comment,
    required this.onApprove,
    required this.onReject,
    required this.onToggleImportant,
    required this.onTogglePulse,
    required this.onReply,
  });

  final FamilyCommentModel comment;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onToggleImportant;
  final VoidCallback onTogglePulse;
  final VoidCallback onReply;

  Color get _riskColor {
    final score = comment.riskScore ?? 0;
    if (score >= 0.6) return AppColors.error;
    if (score >= 0.3) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    comment.userName ?? 'کاربر',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                if (comment.familyInternalName != null)
                  Text(comment.familyInternalName!, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(width: 8),
                Text(formatDateTime(comment.createdAt), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            Text(comment.body),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (comment.riskScore != null)
                  _Badge(text: 'ریسک ${faPercent((comment.riskScore ?? 0) * 100)}', color: _riskColor),
                if (comment.topic != null && comment.topic!.isNotEmpty) _Badge(text: comment.topic!, color: AppColors.primary),
                if (comment.isImportant) const _Badge(text: '⭐ مهم', color: AppColors.warning),
                if (comment.inPulse) const _Badge(text: '📡 Family Pulse', color: AppColors.success),
                if (comment.status == 'rejected' && comment.rejectionReason != null)
                  _Badge(text: labelOf(rejectionReasonLabels, comment.rejectionReason!), color: AppColors.error),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              children: [
                if (comment.status != 'approved')
                  TextButton(onPressed: onApprove, child: const Text('تأیید')),
                if (comment.status != 'rejected')
                  TextButton(
                    onPressed: onReject,
                    style: TextButton.styleFrom(foregroundColor: AppColors.error),
                    child: const Text('رد'),
                  ),
                TextButton(onPressed: onToggleImportant, child: Text(comment.isImportant ? 'حذف از مهم' : 'مهم کن')),
                if (comment.status == 'approved')
                  TextButton(onPressed: onTogglePulse, child: Text(comment.inPulse ? 'حذف از Pulse' : 'افزودن به Pulse')),
                TextButton(onPressed: onReply, child: const Text('پاسخ بهرام')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}

class _RejectDialog extends StatefulWidget {
  const _RejectDialog();

  @override
  State<_RejectDialog> createState() => _RejectDialogState();
}

class _RejectDialogState extends State<_RejectDialog> {
  String _reason = 'other';
  final _noteCtrl = TextEditingController();

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('رد نظر'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<String>(
            value: _reason,
            items: rejectionReasonLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
            onChanged: (v) => setState(() => _reason = v ?? 'other'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteCtrl,
            decoration: const InputDecoration(labelText: 'یادداشت (اختیاری)'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('انصراف')),
        FilledButton(
          onPressed: () => Navigator.pop(context, (reason: _reason, note: _noteCtrl.text.trim())),
          child: const Text('رد نظر'),
        ),
      ],
    );
  }
}

class _ReplySheet extends StatefulWidget {
  const _ReplySheet({required this.comment});

  final FamilyCommentModel comment;

  @override
  State<_ReplySheet> createState() => _ReplySheetState();
}

class _ReplySheetState extends State<_ReplySheet> {
  var _mode = 'text';
  final _textCtrl = TextEditingController();
  FamilyMediaRef? _voice;
  var _uploading = false;
  var _sending = false;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickVoice() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.audio);
    final path = result?.files.single.path;
    if (path == null) return;

    setState(() => _uploading = true);
    try {
      final media = await context.read<AppState>().manager.uploadMedia(file: File(path), type: 'voice');
      setState(() => _voice = media);
    } catch (e) {
      _show(messageOf(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _send() async {
    if (_mode == 'text' && _textCtrl.text.trim().isEmpty) {
      _show('متن پاسخ را وارد کنید.');
      return;
    }
    if (_mode == 'voice' && _voice == null) {
      _show('ابتدا فایل صوتی را آپلود کنید.');
      return;
    }

    setState(() => _sending = true);
    try {
      await context.read<AppState>().manager.replyToComment(
            commentId: widget.comment.id,
            type: _mode,
            text: _mode == 'text' ? _textCtrl.text.trim() : null,
            mediaId: _mode == 'voice' ? _voice!.id : null,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      _show(messageOf(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('پاسخ بهرام به نظر', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(widget.comment.body, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'text', label: Text('متنی')),
              ButtonSegment(value: 'voice', label: Text('صوتی')),
            ],
            selected: {_mode},
            onSelectionChanged: (s) => setState(() => _mode = s.first),
          ),
          const SizedBox(height: 16),
          if (_mode == 'text')
            TextField(
              controller: _textCtrl,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'متن پاسخ'),
            )
          else if (_uploading)
            const Center(child: CircularProgressIndicator())
          else if (_voice == null)
            OutlinedButton.icon(
              onPressed: _pickVoice,
              icon: const Icon(Icons.mic_rounded),
              label: const Text('انتخاب و آپلود فایل صوتی'),
            )
          else
            Text('✅ ${_voice!.originalFilename ?? 'فایل صوتی'} آماده شد'),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _sending ? null : _send,
            child: _sending
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('ارسال پاسخ'),
          ),
        ],
      ),
    );
  }
}
