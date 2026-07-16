import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/posts/widgets/family_picker_sheet.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_action_results_panel.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_editor_action_bar.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_type_selector.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_dialog.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

class PostEditorScreen extends StatefulWidget {
  const PostEditorScreen({super.key, this.post});

  final FamilyPostModel? post;

  @override
  State<PostEditorScreen> createState() => _PostEditorScreenState();
}

class _PostEditorScreenState extends State<PostEditorScreen> {
  final _textCtrl = TextEditingController();
  final _actionPromptCtrl = TextEditingController();
  final _followUpMinutesCtrl = TextEditingController();
  final _followUpMessageCtrl = TextEditingController();
  final _scaleMinCtrl = TextEditingController();
  final _scaleMaxCtrl = TextEditingController();
  final List<TextEditingController> _optionControllers = [];

  FamilyPostModel? _post;
  late String _type;
  late String _audienceMode;
  late bool _isImportant;
  bool _commentsEnabled = true;
  final Set<int> _selectedFamilyIds = {};
  final _actionDaysCtrl = TextEditingController(text: '7');
  final _aiTopicCtrl = TextEditingController();

  FamilyMediaRef? _mediaRef;
  bool _uploading = false;
  double _uploadProgress = 0;

  bool _actionEnabled = false;
  String _actionType = 'commitment';

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _post = widget.post;
    _type = _post?.type ?? 'text';
    _audienceMode = _post?.audienceMode ?? 'all';
    _isImportant = _post?.isImportant ?? false;
    _commentsEnabled = _post?.commentsEnabled ?? true;
    _selectedFamilyIds.addAll(_post?.targetFamilyIds ?? []);

    final textBlock = _post?.blocks.firstWhereOrNull((b) => b.type == 'text');
    _textCtrl.text = textBlock?.textContent ?? '';

    final mediaBlock = _post?.blocks.firstWhereOrNull((b) => b.media != null);
    _mediaRef = mediaBlock?.media;

    final action = _post?.actions.firstWhereOrNull((_) => true);
    if (action != null) {
      _actionEnabled = true;
      _actionType = action.type;
      _actionPromptCtrl.text = action.prompt;
      if (action.activeUntil != null) {
        final until = DateTime.tryParse(action.activeUntil!);
        if (until != null) {
          final days = until.difference(DateTime.now()).inDays.clamp(1, 365);
          _actionDaysCtrl.text = days.toString();
        }
      }
      for (final opt in action.options) {
        _optionControllers.add(TextEditingController(text: opt.label));
      }
    }
    if (_optionControllers.isEmpty) {
      _optionControllers.add(TextEditingController());
      _optionControllers.add(TextEditingController());
    }
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _actionPromptCtrl.dispose();
    _followUpMinutesCtrl.dispose();
    _followUpMessageCtrl.dispose();
    _scaleMinCtrl.dispose();
    _scaleMaxCtrl.dispose();
    _actionDaysCtrl.dispose();
    _aiTopicCtrl.dispose();
    for (final c in _optionControllers) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _isArchived => _post?.isArchived ?? false;

  String get _audiencePreviewLabel {
    if (_audienceMode == 'all') return 'همه خانواده‌ها';
    final knownNames = _post?.targetFamilies
            .where((target) => _selectedFamilyIds.contains(target.familyId))
            .map((target) => target.familyName)
            .whereType<String>()
            .where((name) => name.isNotEmpty)
            .toList() ??
        [];
    if (_audienceMode == 'include') {
      if (knownNames.isNotEmpty) return knownNames.join('، ');
      if (_selectedFamilyIds.isEmpty) return 'خانواده‌های انتخابی';
      return '${_selectedFamilyIds.length} خانواده انتخابی';
    }
    if (knownNames.isNotEmpty) return 'همه به‌جز ${knownNames.join('، ')}';
    if (_selectedFamilyIds.isEmpty) return 'همه به‌جز…';
    return 'همه به‌جز ${_selectedFamilyIds.length} خانواده';
  }

  String get _blockTypeForPostType => switch (_type) {
        'voice' => 'audio',
        'video' => 'video',
        'image' => 'image',
        _ => 'text',
      };

  Future<void> _pickAndUploadMedia() async {
    final fileType = switch (_type) {
      'voice' => FileType.audio,
      'video' => FileType.video,
      'image' => FileType.image,
      _ => FileType.any,
    };

    final result = await FilePicker.platform.pickFiles(type: fileType, withData: true);
    final picked = result?.files.singleOrNull;
    if (picked == null) return;

    final bytes = picked.bytes;
    if (bytes == null) {
      showAppSnackBar(context, 'خواندن فایل ناموفق بود.');
      return;
    }

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
    });

    try {
      final media = await context.read<AppState>().manager.uploadMedia(
            bytes: bytes,
            filename: picked.name,
            type: _type,
            onProgress: (p) {
              if (mounted) setState(() => _uploadProgress = p);
            },
          );
      if (mounted) setState(() => _mediaRef = media);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Map<String, dynamic> _buildPayload() {
    final blocks = <Map<String, dynamic>>[];

    if (_type == 'text') {
      blocks.add({'type': 'text', 'position': 0, 'text': _textCtrl.text.trim()});
    } else {
      if (_mediaRef != null) {
        blocks.add({'type': _blockTypeForPostType, 'position': 0, 'media_id': _mediaRef!.id});
      }
      if (_textCtrl.text.trim().isNotEmpty) {
        blocks.add({'type': 'text', 'position': 1, 'text': _textCtrl.text.trim()});
      }
    }

    final payload = <String, dynamic>{
      'type': _type,
      'audience_mode': _audienceMode,
      'is_important': _isImportant,
      'comments_enabled': _commentsEnabled,
      'blocks': blocks,
      'family_ids': _audienceMode == 'all' ? <int>[] : _selectedFamilyIds.toList(),
    };

    if (_actionEnabled && _actionPromptCtrl.text.trim().isNotEmpty) {
      final action = <String, dynamic>{
        'type': _actionType,
        'prompt': _actionPromptCtrl.text.trim(),
      };

      if (choiceActionTypes.contains(_actionType)) {
        action['options'] = _optionControllers
            .where((c) => c.text.trim().isNotEmpty)
            .toList()
            .asMap()
            .entries
            .map((e) => {'label': e.value.text.trim(), 'position': e.key})
            .toList();
      }

      if (_actionType == 'scale') {
        final min = int.tryParse(_scaleMinCtrl.text);
        final max = int.tryParse(_scaleMaxCtrl.text);
        if (min != null || max != null) {
          action['config'] = {if (min != null) 'min': min, if (max != null) 'max': max};
        }
      }

      final minutes = int.tryParse(_followUpMinutesCtrl.text);
      if (minutes != null && minutes > 0) {
        action['follow_up_after_minutes'] = minutes;
        if (_followUpMessageCtrl.text.trim().isNotEmpty) {
          action['follow_up_message'] = _followUpMessageCtrl.text.trim();
        }
      }

      final days = int.tryParse(_actionDaysCtrl.text) ?? 7;
      action['active_until'] = DateTime.now().add(Duration(days: days)).toUtc().toIso8601String();
      action['is_active'] = true;

      payload['action'] = action;
    }

    return payload;
  }

  Future<void> _generateAiDraft() async {
    final topic = _aiTopicCtrl.text.trim().isNotEmpty ? _aiTopicCtrl.text.trim() : _textCtrl.text.trim();
    if (topic.isEmpty) {
      showAppSnackBar(context, 'موضوع یا متن اولیه را وارد کنید.');
      return;
    }
    setState(() => _saving = true);
    try {
      final draft = await context.read<AppState>().manager.generatePostDraft(topic: topic, type: _type);
      final text = draft['text']?.toString() ?? '';
      if (text.isNotEmpty) {
        setState(() => _textCtrl.text = text);
      }
      if (mounted) showAppSnackBar(context, 'پیش‌نویس AI آماده شد.');
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _save() async {
    if (_type == 'text' && _textCtrl.text.trim().isEmpty) {
      showAppSnackBar(context, 'متن پست را وارد کنید.');
      return;
    }
    if (_type != 'text' && _mediaRef == null) {
      showAppSnackBar(context, 'ابتدا رسانه را آپلود کنید.');
      return;
    }

    setState(() => _saving = true);
    try {
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = _post == null ? await manager.createPost(payload) : await manager.updatePost(_post!.id, payload);
      setState(() => _post = saved);
      showAppSnackBar(context, _isArchived ? 'تغییرات آرشیو ذخیره شد.' : (_post!.isPublished ? 'تغییرات ذخیره شد.' : 'پیش‌نویس ذخیره شد.'));
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _publish() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.publishPost(_post!.id);
      showAppSnackBar(context, 'پست منتشر شد.');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _republish() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = await manager.updatePost(_post!.id, payload);
      if (mounted) setState(() => _post = saved);
      await manager.publishPost(_post!.id);
      showAppSnackBar(context, 'پست دوباره منتشر شد و به بالای فید رفت.');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _archive() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.archivePost(_post!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _recover() async {
    if (_post == null) return;
    final wasPublished = _post!.publishedAt != null;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: 'بازیابی از آرشیو',
      content: Text(
        wasPublished
            ? 'این پست دوباره منتشر می‌شود و در فید خانواده نمایش داده می‌شود.'
            : 'این پست به پیش‌نویس‌ها برمی‌گردد.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('بازیابی')),
      ],
    );
    if (confirmed != true) return;

    setState(() => _saving = true);
    try {
      final recovered = await context.read<AppState>().manager.recoverPost(_post!.id);
      if (mounted) {
        showAppSnackBar(
          context,
          recovered.isPublished ? 'پست بازیابی و دوباره منتشر شد.' : 'پست به پیش‌نویس‌ها برگشت.',
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _togglePin() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      final updated = _post!.isPinned
          ? await context.read<AppState>().manager.unpinPost(_post!.id)
          : await context.read<AppState>().manager.pinPost(_post!.id);
      if (mounted) {
        setState(() => _post = updated);
        showAppSnackBar(context, updated.isPinned ? 'پست سنجاق شد.' : 'سنجاق برداشته شد.');
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    if (_post == null) return;
    final isPublished = _post!.isPublished;
    final isArchived = _isArchived;
    final confirmed = await showGlassDialog<bool>(
      context: context,
      title: isArchived
          ? 'حذف پست آرشیوشده'
          : (isPublished ? 'حذف پست منتشرشده' : 'حذف پیش‌نویس'),
      content: Text(
        isArchived
            ? 'این پست آرشیوشده برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.'
            : (isPublished
                ? 'این پست از فید خانواده حذف می‌شود. این عمل قابل بازگشت نیست.'
                : 'این پیش‌نویس برای همیشه حذف می‌شود.'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          style: TextButton.styleFrom(foregroundColor: AppColors.error),
          child: const Text('حذف'),
        ),
      ],
    );
    if (confirmed != true) return;

    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.deletePost(_post!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickFamilies() async {
    final result = await showFamilyPickerSheet(context, _selectedFamilyIds);
    if (result != null) {
      setState(() {
        _selectedFamilyIds
          ..clear()
          ..addAll(result);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: Text(
          _post == null
              ? 'پست جدید'
              : (_isArchived
                  ? 'ویرایش پست آرشیوشده'
                  : (_post!.isPublished ? 'ویرایش پست منتشرشده' : 'ویرایش پست')),
        ),
      ),
      bottomNavigationBar: PostEditorActionBar(
        post: _post,
        saving: _saving,
        onSave: _save,
        onPublish: _post != null && _post!.isDraft ? _publish : null,
        onRepublish: _post != null && (_post!.isPublished || _isArchived) ? _republish : null,
        onDelete: _post != null ? _delete : null,
        onArchive: _post != null && _post!.isPublished ? _archive : null,
        onRecover: _isArchived ? _recover : null,
        onTogglePin: _post != null && _post!.isPublished ? _togglePin : null,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: ListView(
            padding: AppBreakpoints.pagePadding(context).copyWith(bottom: 120),
            children: [
          if (_post == null)
            PanelGradientCard(
              variant: PanelGradientVariant.teal,
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 28),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      'پست جدید برای خانواده',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          if (_post == null) const SizedBox(height: AppSpacing.lg),
          if (_isArchived)
            GlassPanel(
              borderRadius: 16,
              blur: 18,
              padding: const EdgeInsets.all(AppSpacing.md),
              child: const Row(
                children: [
                  Icon(Icons.archive_rounded, color: AppColors.warning),
                  SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      'این پست آرشیوشده است. می‌توانید ویرایش کنید، دوباره منتشر کنید، یا بدون انتشار مجدد بازیابی کنید.',
                    ),
                  ),
                ],
              ),
            ),
          if (_isArchived) const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'محتوا',
            icon: Icons.edit_note_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_post == null) ...[
                  PostTypeSelector(
                    selected: _type,
                    enabled: true,
                    onChanged: (t) => setState(() {
                      _type = t;
                      _mediaRef = null;
                    }),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],
                TextField(
                  controller: _textCtrl,
                  maxLines: 6,
                  decoration: InputDecoration(
                    labelText: _type == 'text' ? 'متن پست' : 'کپشن (اختیاری)',
                    alignLabelWithHint: true,
                  ),
                ),
                if (_type != 'text') ...[
                  const SizedBox(height: AppSpacing.lg),
                  if (_mediaRef == null)
                    UploadZone(
                      label: 'انتخاب و آپلود ${labelOf(mediaTypeLabels, _type)}',
                      uploading: _uploading,
                      progress: _uploadProgress,
                      enabled: true,
                      onTap: _pickAndUploadMedia,
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        FamilyMediaView(media: _mediaRef!, height: _mediaRef!.isAudio ? 88 : 240),
                        ...[
                          const SizedBox(height: AppSpacing.sm),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton.icon(
                              onPressed: () => setState(() => _mediaRef = null),
                              icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
                              label: const Text('حذف رسانه', style: TextStyle(color: AppColors.error)),
                            ),
                          ),
                        ],
                      ],
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'مخاطب و اولویت',
            icon: Icons.groups_rounded,
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  value: _audienceMode,
                  items: audienceModeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                  onChanged: (v) => setState(() => _audienceMode = v ?? 'all'),
                ),
                const SizedBox(height: AppSpacing.sm),
                Align(
                  alignment: Alignment.centerRight,
                  child: StatusChip(
                    label: _audiencePreviewLabel,
                    color: AppColors.accent,
                    icon: Icons.campaign_rounded,
                  ),
                ),
                if (_audienceMode != 'all') ...[
                  const SizedBox(height: AppSpacing.md),
                  SecondaryButton(
                    label: 'انتخاب خانواده‌ها (${toFaDigits(_selectedFamilyIds.length.toString())})',
                    icon: Icons.groups_rounded,
                    onPressed: _pickFamilies,
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('نظرات فعال'),
                  subtitle: const Text('می‌توانید برای هر پست نظردهی را ببندید'),
                  value: _commentsEnabled,
                  onChanged: (v) => setState(() => _commentsEnabled = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Row(
                    children: [
                      Icon(Icons.star_rounded, size: 20, color: AppColors.gold),
                      SizedBox(width: AppSpacing.sm),
                      Text('پست مهم (اعلان فوری)'),
                    ],
                  ),
                  value: _isImportant,
                  onChanged: (v) => setState(() => _isImportant = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'کمک AI برای محتوا',
            icon: Icons.auto_awesome_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _aiTopicCtrl,
                  decoration: const InputDecoration(
                    labelText: 'موضوع پست (اختیاری)',
                    hintText: 'مثلاً: انگیزه برای شروع هفته',
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                OutlinedButton.icon(
                  onPressed: _saving ? null : _generateAiDraft,
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: const Text('تولید پیش‌نویس با AI'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'اکشن تعاملی',
            icon: Icons.ads_click_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('افزودن اکشن تعاملی'),
                  value: _actionEnabled,
                  onChanged: (v) => setState(() => _actionEnabled = v),
                ),
                if (_actionEnabled) ..._buildActionFields(),
              ],
            ),
          ),
          if (_post != null && (_post!.isPublished || _post!.isArchived) && _post!.actions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            PostActionResultsPanel(postId: _post!.id),
          ],
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildActionFields() {
    return [
      const SizedBox(height: AppSpacing.md),
      DropdownButtonFormField<String>(
        value: _actionType,
        decoration: const InputDecoration(labelText: 'نوع اکشن'),
        items: actionTypeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
        onChanged: (v) => setState(() => _actionType = v ?? 'commitment'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _actionPromptCtrl,
        decoration: const InputDecoration(labelText: 'متن سؤال/درخواست'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _actionDaysCtrl,
        decoration: const InputDecoration(
          labelText: 'مدت فعال بودن (روز)',
          helperText: 'پس از این مدت نظرسنجی/تعهد بسته می‌شود (پیش‌فرض ۷ روز)',
        ),
        keyboardType: TextInputType.number,
      ),
      if (choiceActionTypes.contains(_actionType)) ...[
        const SizedBox(height: AppSpacing.md),
        const Text('گزینه‌ها', style: TextStyle(color: AppColors.textMuted)),
        ..._optionControllers.asMap().entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(top: AppSpacing.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: entry.value,
                        decoration: InputDecoration(labelText: 'گزینه ${toFaDigits((entry.key + 1).toString())}', isDense: true),
                      ),
                    ),
                    if (_optionControllers.length > 2)
                      IconButton(
                        onPressed: () => setState(() => _optionControllers.removeAt(entry.key)),
                        icon: const Icon(Icons.remove_circle_outline_rounded),
                      ),
                  ],
                ),
              ),
            ),
        TextButton.icon(
            onPressed: () => setState(() => _optionControllers.add(TextEditingController())),
            icon: const Icon(Icons.add_rounded),
            label: const Text('افزودن گزینه'),
          ),
      ],
      if (_actionType == 'scale') ...[
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _scaleMinCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداقل (پیش‌فرض ۱)'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: TextField(
                controller: _scaleMaxCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداکثر (پیش‌فرض ۱۰)'),
              ),
            ),
          ],
        ),
      ],
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _followUpMinutesCtrl,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'پیگیری بعد از (دقیقه) — اختیاری'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _followUpMessageCtrl,
        decoration: const InputDecoration(labelText: 'پیام پیگیری — اختیاری'),
      ),
    ];
  }
}
