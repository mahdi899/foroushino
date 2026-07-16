import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/comments/comment_card.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/navigation/app_bottom_nav.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

class CommentsScreen extends StatefulWidget {
  const CommentsScreen({super.key});

  @override
  State<CommentsScreen> createState() => _CommentsScreenState();
}

class _CommentsScreenState extends State<CommentsScreen> with SingleTickerProviderStateMixin {
  static const _tabs = ['pending', 'approved', 'rejected', 'important', 'unread', 'coaching_questions'];
  static const _tabLabels = {
    'pending': 'در انتظار',
    'approved': 'تأییدشده',
    'rejected': 'رد‌شده',
    'important': 'مهم',
    'unread': 'خوانده‌نشده',
    'coaching_questions': 'سؤال کوچینگ',
  };

  late final TabController _tabController;
  Future<PaginatedResult<FamilyCommentModel>>? _future;
  final Set<int> _selectedPendingIds = {};

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
      showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _reject(FamilyCommentModel comment) async {
    final result = await showAppBottomSheet<({String reason, String note})>(
      context: context,
      title: 'رد نظر',
      child: _RejectSheetContent(),
    );
    if (result == null) return;

    try {
      await context.read<AppState>().manager.rejectComment(comment.id, reason: result.reason, note: result.note);
      _load();
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _toggleImportant(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.toggleImportant(comment.id);
      _load();
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _togglePulse(FamilyCommentModel comment) async {
    try {
      await context.read<AppState>().manager.togglePulse(comment.id);
      _load();
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    }
  }

  Future<void> _reply(FamilyCommentModel comment) async {
    final replied = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => ReplySheet(comment: comment),
    );
    if (replied == true) _load();
  }

  Future<void> _batchApprove() async {
    if (_selectedPendingIds.isEmpty) return;
    try {
      final count = await context.read<AppState>().manager.batchApprove(_selectedPendingIds.toList());
      if (mounted) {
        showAppSnackBar(context, '${toFaDigits(count.toString())} نظر تأیید شد.');
        setState(_selectedPendingIds.clear);
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPendingTab = _tabs[_tabController.index] == 'pending';

    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: Text(_selectedPendingIds.isEmpty
            ? 'نظرات خانواده'
            : '${toFaDigits(_selectedPendingIds.length.toString())} انتخاب‌شده'),
        actions: isPendingTab && _selectedPendingIds.isNotEmpty
            ? [
                IconButton(
                  tooltip: 'تأیید گروهی',
                  onPressed: _batchApprove,
                  icon: const Icon(Icons.done_all_rounded),
                ),
              ]
            : null,
        bottom: AppTabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _tabs.map((t) => _tabLabels[t]!).toList(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<PaginatedResult<FamilyCommentModel>>(
          future: _future,
          builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilyCommentModel>>(
            snapshot: snapshot,
            emptyMessage: 'نظری وجود ندارد.',
            emptyIcon: Icons.forum_outlined,
            builder: (context, data) {
              final comments = data.items;
              if (comments.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [EmptyState(title: 'نظری وجود ندارد', icon: Icons.forum_outlined)],
                );
              }

              return ListView.separated(
                padding: AppBreakpoints.pagePadding(context),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: comments.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                itemBuilder: (context, index) {
                  final c = comments[index];
                  final selected = _selectedPendingIds.contains(c.id);
                  return CommentCard(
                    comment: c,
                    selectable: isPendingTab,
                    selected: selected,
                    onSelectedChanged: isPendingTab
                        ? (value) => setState(() {
                              if (value) {
                                _selectedPendingIds.add(c.id);
                              } else {
                                _selectedPendingIds.remove(c.id);
                              }
                            })
                        : null,
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
      ),
    );
  }
}

class _RejectSheetContent extends StatefulWidget {
  @override
  State<_RejectSheetContent> createState() => _RejectSheetContentState();
}

class _RejectSheetContentState extends State<_RejectSheetContent> {
  String _reason = 'other';
  final _noteCtrl = TextEditingController();

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          value: _reason,
          items: rejectionReasonLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
          onChanged: (v) => setState(() => _reason = v ?? 'other'),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _noteCtrl,
          decoration: const InputDecoration(labelText: 'یادداشت (اختیاری)'),
        ),
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: 'رد نظر',
          onPressed: () => Navigator.pop(context, (reason: _reason, note: _noteCtrl.text.trim())),
        ),
      ],
    );
  }
}

class ReplySheet extends StatefulWidget {
  const ReplySheet({super.key, required this.comment});

  final FamilyCommentModel comment;

  @override
  State<ReplySheet> createState() => _ReplySheetState();
}

class _ReplySheetState extends State<ReplySheet> {
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
    final result = await FilePicker.platform.pickFiles(type: FileType.audio, withData: true);
    final picked = result?.files.singleOrNull;
    if (picked == null) return;

    final bytes = picked.bytes;
    if (bytes == null) {
      showAppSnackBar(context, 'خواندن فایل صوتی ناموفق بود.');
      return;
    }

    setState(() => _uploading = true);
    try {
      final media = await context.read<AppState>().manager.uploadMedia(
            bytes: bytes,
            filename: picked.name,
            type: 'voice',
          );
      setState(() => _voice = media);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _send() async {
    if (_mode == 'text' && _textCtrl.text.trim().isEmpty) {
      showAppSnackBar(context, 'متن پاسخ را وارد کنید.');
      return;
    }
    if (_mode == 'voice' && _voice == null) {
      showAppSnackBar(context, 'ابتدا فایل صوتی را آپلود کنید.');
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
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: 0,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('پاسخ بهرام به نظر', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(widget.comment.body, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.lg),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'text', label: Text('متنی'), icon: Icon(Icons.text_fields_rounded, size: 18)),
              ButtonSegment(value: 'voice', label: Text('صوتی'), icon: Icon(Icons.mic_rounded, size: 18)),
            ],
            selected: {_mode},
            onSelectionChanged: (s) => setState(() => _mode = s.first),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (_mode == 'text')
            TextField(
              controller: _textCtrl,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'متن پاسخ'),
            )
          else if (_voice == null)
            UploadZone(
              label: 'انتخاب و آپلود فایل صوتی',
              uploading: _uploading,
              onTap: _pickVoice,
            )
          else
            FamilyMediaView(media: _voice!, compact: true),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(label: 'ارسال پاسخ', loading: _sending, onPressed: _send),
        ],
      ),
    );
  }
}
