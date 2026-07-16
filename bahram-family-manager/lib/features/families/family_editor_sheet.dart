import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

Future<bool?> showFamilyEditorSheet({
  required BuildContext context,
  FamilyDetailModel? family,
}) {
  return showAppBottomSheet<bool>(
    context: context,
    title: family == null ? 'ایجاد خانواده' : 'ویرایش خانواده',
    subtitle: family == null ? 'خانواده جدید به‌صورت دستی ساخته می‌شود.' : family.internalName,
    scrollable: true,
    initialChildSize: 0.85,
    child: _FamilyEditorForm(family: family),
  );
}

class _FamilyEditorForm extends StatefulWidget {
  const _FamilyEditorForm({this.family});

  final FamilyDetailModel? family;

  @override
  State<_FamilyEditorForm> createState() => _FamilyEditorFormState();
}

class _FamilyEditorFormState extends State<_FamilyEditorForm> {
  final _nameCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _targetCtrl = TextEditingController(text: '5000');
  final _minCtrl = TextEditingController(text: '4500');
  final _maxCtrl = TextEditingController(text: '5200');

  String _lifecycle = 'forming';
  String? _primarySource;
  int? _entryEventId;
  bool _acceptingMembers = true;
  bool _pending = false;
  String? _error;
  List<FamilyEntryEventModel> _events = [];

  bool get _isEdit => widget.family != null;

  @override
  void initState() {
    super.initState();
    final family = widget.family;
    if (family != null) {
      _nameCtrl.text = family.internalName;
      _descriptionCtrl.text = family.profile.description ?? '';
      _notesCtrl.text = family.profile.notes ?? '';
      _targetCtrl.text = family.capacityTarget.toString();
      _minCtrl.text = family.capacityMin.toString();
      _maxCtrl.text = family.capacityMax.toString();
      _lifecycle = family.lifecycle;
      _primarySource = family.primarySource;
      _entryEventId = family.entryEventId;
      _acceptingMembers = family.acceptingMembers;
    }
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    try {
      final events = await context.read<AppState>().manager.listEntryEvents();
      if (!mounted) return;
      setState(() => _events = events);
    } catch (_) {}
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descriptionCtrl.dispose();
    _notesCtrl.dispose();
    _targetCtrl.dispose();
    _minCtrl.dispose();
    _maxCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> _payload() {
    return {
      if (_isEdit || _nameCtrl.text.trim().isNotEmpty) 'internal_name': _nameCtrl.text.trim(),
      'lifecycle': _lifecycle,
      'primary_source': _primarySource,
      'entry_event_id': _entryEventId,
      'capacity_target': int.tryParse(_targetCtrl.text.trim()),
      'capacity_min': int.tryParse(_minCtrl.text.trim()),
      'capacity_max': int.tryParse(_maxCtrl.text.trim()),
      'accepting_members': _acceptingMembers,
      'profile_description': _descriptionCtrl.text.trim().isEmpty ? null : _descriptionCtrl.text.trim(),
      'profile_notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
    };
  }

  Future<void> _save() async {
    if (_pending) return;
    if (_nameCtrl.text.trim().isEmpty && _isEdit) {
      setState(() => _error = 'نام داخلی خانواده الزامی است.');
      return;
    }

    setState(() {
      _pending = true;
      _error = null;
    });

    try {
      final manager = context.read<AppState>().manager;
      if (_isEdit) {
        await manager.updateFamily(widget.family!.id, _payload());
      } else {
        await manager.createFamily(_payload());
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'ذخیره ناموفق بود.');
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(labelText: 'نام داخلی'),
        ),
        const SizedBox(height: AppSpacing.md),
        DropdownButtonFormField<String>(
          value: _lifecycle,
          decoration: const InputDecoration(labelText: 'وضعیت'),
          items: lifecycleLabels.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
              .toList(),
          onChanged: (v) => setState(() => _lifecycle = v ?? _lifecycle),
        ),
        const SizedBox(height: AppSpacing.md),
        DropdownButtonFormField<String?>(
          value: _primarySource,
          decoration: const InputDecoration(labelText: 'منبع اصلی'),
          items: [
            const DropdownMenuItem<String?>(value: null, child: Text('—')),
            ...entrySourceLabels.entries.map(
              (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
            ),
          ],
          onChanged: (v) => setState(() => _primarySource = v),
        ),
        const SizedBox(height: AppSpacing.md),
        DropdownButtonFormField<int?>(
          value: _entryEventId,
          decoration: const InputDecoration(labelText: 'رویداد ورود'),
          items: [
            const DropdownMenuItem<int?>(value: null, child: Text('—')),
            ..._events.map(
              (e) => DropdownMenuItem(
                value: e.id,
                child: Text(e.externalReference == null ? e.name : '${e.name} (${e.externalReference})'),
              ),
            ),
          ],
          onChanged: (v) => setState(() => _entryEventId = v),
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _targetCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'ظرفیت هدف'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: TextField(
                controller: _minCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداقل'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: TextField(
                controller: _maxCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'حداکثر'),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('پذیرش عضو جدید'),
          subtitle: const Text('اگر خاموش باشد، الگوریتم این خانواده را انتخاب نمی‌کند.'),
          value: _acceptingMembers,
          onChanged: (v) => setState(() => _acceptingMembers = v),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _descriptionCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'توضیح پروفایل',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _notesCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'یادداشت مدیر',
            alignLabelWithHint: true,
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.md),
          Text(_error!, style: const TextStyle(color: AppColors.error)),
        ],
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: _pending ? 'در حال ذخیره…' : (_isEdit ? 'ذخیره تغییرات' : 'ایجاد خانواده'),
          onPressed: _pending ? null : _save,
        ),
      ],
    );
  }
}
