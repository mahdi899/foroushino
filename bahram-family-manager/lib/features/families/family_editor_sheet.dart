import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

Future<int?> showFamilyEditorSheet({
  required BuildContext context,
  FamilyDetailModel? family,
  String? initialName,
  String? initialPrimarySource,
}) {
  final isNarrow = !AppBreakpoints.isDesktop(context);
  return showAppBottomSheet<int>(
    context: context,
    title: family == null ? 'ایجاد خانواده' : 'ویرایش خانواده',
    subtitle: family == null ? 'خانواده جدید به‌صورت دستی ساخته می‌شود.' : family.internalName,
    scrollable: true,
    initialChildSize: isNarrow ? 0.92 : 0.85,
    child: _FamilyEditorForm(
      family: family,
      initialName: initialName,
      initialPrimarySource: initialPrimarySource,
    ),
  );
}

class _FamilyEditorForm extends StatefulWidget {
  const _FamilyEditorForm({
    this.family,
    this.initialName,
    this.initialPrimarySource,
  });

  final FamilyDetailModel? family;
  final String? initialName;
  final String? initialPrimarySource;

  @override
  State<_FamilyEditorForm> createState() => _FamilyEditorFormState();
}

class _FamilyEditorFormState extends State<_FamilyEditorForm> {
  final _nameCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _capacityCtrl = TextEditingController(text: '5200');

  String _lifecycle = 'active';
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
      _capacityCtrl.text = family.capacityMax.toString();
      _lifecycle = normalizeLifecycle(family.lifecycle);
      _primarySource = family.primarySource;
      _entryEventId = family.entryEventId;
      _acceptingMembers = family.acceptingMembers;
    } else {
      if (widget.initialName != null && widget.initialName!.trim().isNotEmpty) {
        _nameCtrl.text = widget.initialName!.trim();
      }
      _primarySource = widget.initialPrimarySource ?? _primarySource;
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
    _capacityCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> _payload() {
    return {
      if (_isEdit || _nameCtrl.text.trim().isNotEmpty) 'internal_name': _nameCtrl.text.trim(),
      'lifecycle': _lifecycle,
      'primary_source': _primarySource,
      'entry_event_id': _entryEventId,
      'capacity_max': int.tryParse(_capacityCtrl.text.trim()),
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
        if (!mounted) return;
        Navigator.of(context).pop(widget.family!.id);
      } else {
        final created = await manager.createFamily(_payload());
        if (!mounted) return;
        Navigator.of(context).pop(created.id);
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'ذخیره ناموفق بود.');
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  Future<void> _pickPrimarySource() async {
    final picked = await showAppBottomSheet<_PrimarySourcePick>(
      context: context,
      title: 'منبع اصلی',
      subtitle: 'منبع جذب اعضای این خانواده را انتخاب کنید.',
      scrollable: true,
      initialChildSize: 0.62,
      child: _PrimarySourcePickerList(selected: _primarySource),
    );
    if (!mounted || picked == null) return;
    setState(() => _primarySource = picked.value);
  }

  Future<void> _pickLifecycle() async {
    final picked = await showAppBottomSheet<String>(
      context: context,
      title: 'وضعیت خانواده',
      subtitle: 'خانواده فعال در الگوریتم تخصیص شرکت می‌کند.',
      scrollable: true,
      initialChildSize: 0.45,
      child: _LifecyclePickerList(selected: _lifecycle),
    );
    if (!mounted || picked == null) return;
    setState(() => _lifecycle = picked);
  }

  @override
  Widget build(BuildContext context) {
    final isNarrow = !AppBreakpoints.isDesktop(context);
    final sourceLabel =
        _primarySource == null ? '—' : labelOf(entrySourceLabels, _primarySource!);
    final lifecycleLabelText = labelOf(lifecycleLabels, _lifecycle);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(labelText: 'نام داخلی'),
        ),
        const SizedBox(height: AppSpacing.md),
        InkWell(
          onTap: _pickLifecycle,
          borderRadius: BorderRadius.circular(AppRadius.tile),
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: 'وضعیت',
              suffixIcon: Icon(Icons.keyboard_arrow_down_rounded),
            ),
            child: Text(
              lifecycleLabelText,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        InkWell(
          onTap: _pickPrimarySource,
          borderRadius: BorderRadius.circular(AppRadius.tile),
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: 'منبع اصلی',
              suffixIcon: Icon(Icons.keyboard_arrow_down_rounded),
            ),
            child: Text(
              sourceLabel,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        DropdownButtonFormField<int?>(
          value: _entryEventId,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'رویداد ورود'),
          items: [
            const DropdownMenuItem<int?>(value: null, child: Text('—')),
            ..._events.map(
              (e) => DropdownMenuItem(
                value: e.id,
                child: Text(
                  e.externalReference == null ? e.name : '${e.name} (${e.externalReference})',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ],
          onChanged: (v) => setState(() => _entryEventId = v),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _capacityCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'ظرفیت هدف'),
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
          maxLines: isNarrow ? 2 : 3,
          decoration: const InputDecoration(
            labelText: 'توضیح پروفایل',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _notesCtrl,
          maxLines: isNarrow ? 2 : 3,
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
        // Sheet already pads with viewPadding; keep a small gap above system nav.
        SizedBox(height: MediaQuery.viewPaddingOf(context).bottom > 0 ? AppSpacing.sm : AppSpacing.md),
      ],
    );
  }
}

/// Distinguishes barrier-dismiss (`null`) from an explicit clear (`value: null`).
class _PrimarySourcePick {
  const _PrimarySourcePick(this.value);
  final String? value;
}

class _PrimarySourcePickerList extends StatelessWidget {
  const _PrimarySourcePickerList({required this.selected});

  final String? selected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final options = [
      const MapEntry<String?, String>(null, '—'),
      ...selectableEntrySources.map((e) => MapEntry<String?, String>(e.key, e.value)),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final option in options)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(option.value),
            trailing: selected == option.key
                ? Icon(Icons.check_rounded, color: scheme.primary)
                : null,
            onTap: () => Navigator.of(context).pop(_PrimarySourcePick(option.key)),
          ),
      ],
    );
  }
}

class _LifecyclePickerList extends StatelessWidget {
  const _LifecyclePickerList({required this.selected});

  final String selected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final entry in lifecycleLabels.entries)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(entry.value),
            trailing: selected == entry.key
                ? Icon(Icons.check_rounded, color: scheme.primary)
                : null,
            onTap: () => Navigator.of(context).pop(entry.key),
          ),
      ],
    );
  }
}
