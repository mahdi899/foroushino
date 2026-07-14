import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

/// Create/edit a Family post. Published posts open read-only (mirrors the
/// backend rule that published posts can't be edited — only archived).
class PostEditorScreen extends StatefulWidget {
  const PostEditorScreen({super.key, this.post});

  final FamilyPostModel? post;

  @override
  State<PostEditorScreen> createState() => _PostEditorScreenState();
}

const _mediaPostTypes = ['text', 'voice', 'video', 'image'];
const _choiceActionTypes = ['single_choice', 'multi_choice'];

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

    final result = await FilePicker.platform.pickFiles(type: fileType);
    final path = result?.files.single.path;
    if (path == null) return;

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
    });

    try {
      final media = await context.read<AppState>().manager.uploadMedia(
            file: File(path),
            type: _type,
            onProgress: (p) {
              if (mounted) setState(() => _uploadProgress = p);
            },
          );
      if (mounted) setState(() => _mediaRef = media);
    } catch (e) {
      if (mounted) _show(messageOf(e));
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

      if (_choiceActionTypes.contains(_actionType)) {
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
      _show('متن پست را وارد کنید.');
      return;
    }
    if (_type != 'text' && _mediaRef == null) {
      _show('ابتدا رسانه را آپلود کنید.');
      return;
    }

    setState(() => _saving = true);
    try {
      final manager = context.read<AppState>().manager;
      final payload = _buildPayload();
      final saved = _post == null ? await manager.createPost(payload) : await manager.updatePost(_post!.id, payload);
      setState(() => _post = saved);
      _show('پیش‌نویس ذخیره شد.');
    } catch (e) {
      _show(messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _publish() async {
    if (_post == null) return;
    setState(() => _saving = true);
    try {
      final published = await context.read<AppState>().manager.publishPost(_post!.id);
      setState(() => _post = published);
      _show('پست منتشر شد.');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      _show(messageOf(e));
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
      _show(messageOf(e));
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
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.deletePost(_post!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      _show(messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickFamilies() async {
    final result = await showModalBottomSheet<Set<int>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _FamilyPickerSheet(initialSelection: _selectedFamilyIds),
    );
    if (result != null) {
      setState(() {
        _selectedFamilyIds.clear();
        _selectedFamilyIds.addAll(result);
      });
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_post == null ? 'پست جدید' : 'ویرایش پست')),
      body: AbsorbPointer(
        absorbing: _isReadOnly,
        child: Opacity(
          opacity: _isReadOnly ? 0.6 : 1,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_isReadOnly)
                const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text('این پست منتشرشده و قابل ویرایش نیست.', style: TextStyle(color: AppColors.warning)),
                ),
              if (_post == null) _buildTypeSelector(),
              const SizedBox(height: 16),
              TextField(
                controller: _textCtrl,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: _type == 'text' ? 'متن پست' : 'کپشن (اختیاری)',
                ),
              ),
              if (_type != 'text') ...[
                const SizedBox(height: 12),
                _buildMediaSection(),
              ],
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 8),
              _buildAudienceSection(),
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('پست مهم ⭐ (اعلان فوری)'),
                value: _isImportant,
                onChanged: (v) => setState(() => _isImportant = v),
              ),
              const Divider(),
              const SizedBox(height: 8),
              _buildActionSection(),
              const SizedBox(height: 24),
              if (!_isReadOnly)
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(_post == null ? 'ذخیره پیش‌نویس' : 'ذخیره تغییرات'),
                ),
              if (_post != null && _post!.isDraft) ...[
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _saving ? null : _publish, child: const Text('انتشار پست')),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _saving ? null : _delete,
                  style: TextButton.styleFrom(foregroundColor: AppColors.error),
                  child: const Text('حذف پیش‌نویس'),
                ),
              ],
              if (_post != null && _post!.isPublished) ...[
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _saving ? null : _archive, child: const Text('آرشیو پست')),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Wrap(
      spacing: 8,
      children: _mediaPostTypes
          .map((t) => ChoiceChip(
                label: Text(labelOf(postTypeLabels, t)),
                selected: _type == t,
                onSelected: (_) => setState(() {
                  _type = t;
                  _mediaRef = null;
                }),
              ))
          .toList(),
    );
  }

  Widget _buildMediaSection() {
    if (_uploading) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LinearProgressIndicator(value: _uploadProgress == 0 ? null : _uploadProgress),
          const SizedBox(height: 4),
          Text('در حال آپلود... ${toFaDigits((_uploadProgress * 100).toStringAsFixed(0))}٪', style: const TextStyle(color: AppColors.textMuted)),
        ],
      );
    }

    if (_mediaRef == null) {
      return OutlinedButton.icon(
        onPressed: _isReadOnly ? null : _pickAndUploadMedia,
        icon: const Icon(Icons.upload_file_rounded),
        label: Text('انتخاب و آپلود ${labelOf(mediaTypeLabels, _type)}'),
      );
    }

    final ready = _mediaRef!.isReady;
    return Card(
      color: ready ? AppColors.success.withOpacity(0.06) : AppColors.warning.withOpacity(0.06),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(ready ? Icons.check_circle_rounded : Icons.hourglass_top_rounded, color: ready ? AppColors.success : AppColors.warning),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_mediaRef!.originalFilename ?? 'رسانه', maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(
                    '${labelOf(mediaStatusLabels, _mediaRef!.status)} · ${formatBytes(_mediaRef!.size)}',
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            if (!_isReadOnly)
              IconButton(
                onPressed: () => setState(() => _mediaRef = null),
                icon: const Icon(Icons.close_rounded),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAudienceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('مخاطب پست', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _audienceMode,
          items: audienceModeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
          onChanged: _isReadOnly ? null : (v) => setState(() => _audienceMode = v ?? 'all'),
        ),
        if (_audienceMode != 'all') ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _isReadOnly ? null : _pickFamilies,
            icon: const Icon(Icons.groups_rounded),
            label: Text('انتخاب خانواده‌ها (${toFaDigits(_selectedFamilyIds.length.toString())})'),
          ),
        ],
      ],
    );
  }

  Widget _buildActionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('افزودن اکشن تعاملی 🎯'),
          value: _actionEnabled,
          onChanged: _isReadOnly ? null : (v) => setState(() => _actionEnabled = v),
        ),
        if (_actionEnabled) ...[
          DropdownButtonFormField<String>(
            value: _actionType,
            decoration: const InputDecoration(labelText: 'نوع اکشن'),
            items: actionTypeLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
            onChanged: _isReadOnly ? null : (v) => setState(() => _actionType = v ?? 'commitment'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _actionPromptCtrl,
            decoration: const InputDecoration(labelText: 'متن سؤال/درخواست'),
            enabled: !_isReadOnly,
          ),
          if (_choiceActionTypes.contains(_actionType)) ...[
            const SizedBox(height: 8),
            const Text('گزینه‌ها', style: TextStyle(color: AppColors.textMuted)),
            ..._optionControllers.asMap().entries.map(
                  (entry) => Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: entry.value,
                            enabled: !_isReadOnly,
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
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _scaleMinCtrl,
                    enabled: !_isReadOnly,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'حداقل (پیش‌فرض ۱)'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _scaleMaxCtrl,
                    enabled: !_isReadOnly,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'حداکثر (پیش‌فرض ۱۰)'),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 8),
          TextField(
            controller: _followUpMinutesCtrl,
            enabled: !_isReadOnly,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'پیگیری بعد از (دقیقه) — اختیاری'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _followUpMessageCtrl,
            enabled: !_isReadOnly,
            decoration: const InputDecoration(labelText: 'پیام پیگیری — اختیاری'),
          ),
        ],
      ],
    );
  }
}

/// Simple search + multi-select for `audience_mode: include/exclude`.
class _FamilyPickerSheet extends StatefulWidget {
  const _FamilyPickerSheet({required this.initialSelection});

  final Set<int> initialSelection;

  @override
  State<_FamilyPickerSheet> createState() => _FamilyPickerSheetState();
}

class _FamilyPickerSheetState extends State<_FamilyPickerSheet> {
  final _searchCtrl = TextEditingController();
  late Set<int> _selected;
  Future<PaginatedResult<FamilySummaryModel>>? _future;
  Future<List<AudienceSuggestion>>? _suggestionsFuture;

  @override
  void initState() {
    super.initState();
    _selected = {...widget.initialSelection};
    _search();
    _suggestionsFuture = context.read<AppState>().manager.audienceSuggestions();
  }

  void _search() {
    setState(() {
      _future = context.read<AppState>().manager.listFamilies(search: _searchCtrl.text);
    });
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              FutureBuilder<List<AudienceSuggestion>>(
                future: _suggestionsFuture,
                builder: (context, snapshot) {
                  final suggestions = snapshot.data ?? const [];
                  if (suggestions.isEmpty) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: suggestions
                            .map(
                              (s) => ActionChip(
                                avatar: const Icon(Icons.auto_awesome_rounded, size: 16),
                                label: Text('${s.label} (${s.familyIds.length})'),
                                onPressed: () => setState(() => _selected.addAll(s.familyIds)),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  );
                },
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      decoration: const InputDecoration(labelText: 'جستجوی خانواده', isDense: true),
                      onSubmitted: (_) => _search(),
                    ),
                  ),
                  IconButton(onPressed: _search, icon: const Icon(Icons.search_rounded)),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: FutureBuilder<PaginatedResult<FamilySummaryModel>>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (snapshot.hasError) {
                      return Center(child: Text(messageOf(snapshot.error!)));
                    }
                    final families = snapshot.data!.items;
                    return ListView.builder(
                      controller: scrollController,
                      itemCount: families.length,
                      itemBuilder: (context, index) {
                        final f = families[index];
                        final selected = _selected.contains(f.id);
                        return CheckboxListTile(
                          value: selected,
                          title: Text(f.internalName),
                          subtitle: Text('${toFaDigits(f.memberCount.toString())} عضو'),
                          onChanged: (v) => setState(() {
                            if (v == true) {
                              _selected.add(f.id);
                            } else {
                              _selected.remove(f.id);
                            }
                          }),
                        );
                      },
                    );
                  },
                ),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(_selected),
                child: Text('تأیید (${toFaDigits(_selected.length.toString())} انتخاب‌شده)'),
              ),
            ],
          ),
        );
      },
    );
  }
}
