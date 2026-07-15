import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/posts/widgets/family_picker_sheet.dart';
import 'package:bahram_family_manager/features/posts/widgets/post_type_selector.dart';
import 'package:bahram_family_manager/core/utils/media_url.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/media/family_media_view.dart';
import 'package:bahram_family_manager/widgets/media/upload_zone.dart';
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
  final Set<int> _selectedFamilyIds = {};

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
    for (final c in _optionControllers) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _isReadOnly => _post?.isPublished == true;

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

      payload['action'] = action;
    }

    return payload;
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
      showAppSnackBar(context, 'پیش‌نویس ذخیره شد.');
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('حذف پیش‌نویس'),
        content: const Text('این پیش‌نویس برای همیشه حذف می‌شود.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('حذف'),
          ),
        ],
      ),
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
      appBar: AppBar(title: Text(_post == null ? 'پست جدید' : 'ویرایش پست')),
      bottomNavigationBar: _isReadOnly
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.lg),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    PrimaryButton(
                      label: _post == null ? 'ذخیره پیش‌نویس' : 'ذخیره تغییرات',
                      loading: _saving,
                      onPressed: _save,
                    ),
                    if (_post != null && _post!.isDraft) ...[
                      const SizedBox(height: AppSpacing.sm),
                      SecondaryButton(label: 'انتشار پست', icon: Icons.publish_rounded, onPressed: _saving ? null : _publish),
                    ],
                  ],
                ),
              ),
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
          if (_isReadOnly)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.warning),
                  SizedBox(width: AppSpacing.md),
                  Expanded(child: Text('این پست منتشرشده و قابل ویرایش نیست.')),
                ],
              ),
            ),
          if (_isReadOnly) const SizedBox(height: AppSpacing.lg),
          PanelSectionCard(
            title: 'محتوا',
            icon: Icons.edit_note_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_post == null) ...[
                  PostTypeSelector(
                    selected: _type,
                    enabled: !_isReadOnly,
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
                  readOnly: _isReadOnly,
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
                      enabled: !_isReadOnly,
                      onTap: _pickAndUploadMedia,
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        FamilyMediaView(media: _mediaRef!, height: _mediaRef!.isAudio ? 88 : 240),
                        if (!_isReadOnly) ...[
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
                  onChanged: _isReadOnly ? null : (v) => setState(() => _audienceMode = v ?? 'all'),
                ),
                if (_audienceMode != 'all') ...[
                  const SizedBox(height: AppSpacing.md),
                  SecondaryButton(
                    label: 'انتخاب خانواده‌ها (${toFaDigits(_selectedFamilyIds.length.toString())})',
                    icon: Icons.groups_rounded,
                    onPressed: _isReadOnly ? null : _pickFamilies,
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
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
                  onChanged: _isReadOnly ? null : (v) => setState(() => _isImportant = v),
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
                  onChanged: _isReadOnly ? null : (v) => setState(() => _actionEnabled = v),
                ),
                if (_actionEnabled) ..._buildActionFields(),
              ],
            ),
          ),
          if (_post != null && _post!.isDraft) ...[
            const SizedBox(height: AppSpacing.lg),
            TextButton(
              onPressed: _saving ? null : _delete,
              style: TextButton.styleFrom(foregroundColor: AppColors.error),
              child: const Text('حذف پیش‌نویس'),
            ),
          ],
          if (_post != null && _post!.isPublished) ...[
            const SizedBox(height: AppSpacing.lg),
            SecondaryButton(
              label: _post!.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن',
              icon: Icons.push_pin_rounded,
              onPressed: _saving ? null : _togglePin,
            ),
            const SizedBox(height: AppSpacing.sm),
            SecondaryButton(label: 'آرشیو پست', icon: Icons.archive_rounded, onPressed: _saving ? null : _archive),
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
        onChanged: _isReadOnly ? null : (v) => setState(() => _actionType = v ?? 'commitment'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _actionPromptCtrl,
        decoration: const InputDecoration(labelText: 'متن سؤال/درخواست'),
        readOnly: _isReadOnly,
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
                        readOnly: _isReadOnly,
                        decoration: InputDecoration(labelText: 'گزینه ${toFaDigits((entry.key + 1).toString())}', isDense: true),
                      ),
                    ),
                    if (_optionControllers.length > 2 && !_isReadOnly)
                      IconButton(
                        onPressed: () => setState(() => _optionControllers.removeAt(entry.key)),
                        icon: const Icon(Icons.remove_circle_outline_rounded),
                      ),
                  ],
                ),
              ),
            ),
        if (!_isReadOnly)
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
                readOnly: _isReadOnly,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداقل (پیش‌فرض ۱)'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: TextField(
                controller: _scaleMaxCtrl,
                readOnly: _isReadOnly,
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
        readOnly: _isReadOnly,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'پیگیری بعد از (دقیقه) — اختیاری'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: _followUpMessageCtrl,
        readOnly: _isReadOnly,
        decoration: const InputDecoration(labelText: 'پیام پیگیری — اختیاری'),
      ),
    ];
  }
}
