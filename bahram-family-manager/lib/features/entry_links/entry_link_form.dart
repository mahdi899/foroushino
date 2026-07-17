import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';

/// Create or edit an entry link bound to a specific family.
class EntryLinkForm extends StatefulWidget {
  const EntryLinkForm({
    super.key,
    this.link,
    this.initialFamilyId,
    required this.onSaved,
  });

  final EntryLinkModel? link;
  final int? initialFamilyId;
  final VoidCallback onSaved;

  @override
  State<EntryLinkForm> createState() => _EntryLinkFormState();
}

class _EntryLinkFormState extends State<EntryLinkForm> {
  final _nameCtrl = TextEditingController();
  final _campaignCtrl = TextEditingController();
  final _topicCtrl = TextEditingController();
  final _externalRefCtrl = TextEditingController();

  String _source = 'instagram_reel';
  int? _familyId;
  List<FamilySummaryModel> _families = [];
  bool _familiesLoading = true;
  bool _pending = false;
  String? _error;
  EntryLinkModel? _saved;

  bool get _isEdit => widget.link != null;

  @override
  void initState() {
    super.initState();
    final link = widget.link;
    if (link != null) {
      _nameCtrl.text = link.name;
      _campaignCtrl.text = link.campaign ?? '';
      _topicCtrl.text = link.topic ?? '';
      _source = link.source;
      _familyId = link.familyId;
    } else {
      _familyId = widget.initialFamilyId;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadFamilies());
  }

  Future<void> _loadFamilies() async {
    try {
      final result = await context.read<AppState>().cachedFamilies();
      if (!mounted) return;
      setState(() {
        _families = result;
        _familiesLoading = false;
        if (_familyId == null && _families.isNotEmpty) {
          _familyId = _families.first.id;
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _familiesLoading = false;
          _error = messageOf(e);
        });
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _campaignCtrl.dispose();
    _topicCtrl.dispose();
    _externalRefCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_pending) return;
    if (_nameCtrl.text.trim().isEmpty) {
      setState(() => _error = 'نام لینک الزامی است.');
      return;
    }
    if (_familyId == null) {
      setState(() => _error = 'خانواده مقصد را انتخاب کنید.');
      return;
    }

    setState(() {
      _pending = true;
      _error = null;
    });

    try {
      final manager = context.read<AppState>().manager;
      final EntryLinkModel link;
      if (_isEdit) {
        link = await manager.updateEntryLink(widget.link!.id, {
          'name': _nameCtrl.text.trim(),
          'family_id': _familyId,
          'campaign': _campaignCtrl.text.trim().isEmpty ? null : _campaignCtrl.text.trim(),
          'topic': _topicCtrl.text.trim().isEmpty ? null : _topicCtrl.text.trim(),
          if (!widget.link!.isActive) 'is_active': true,
        });
      } else {
        link = await manager.createEntryLink({
          'name': _nameCtrl.text.trim(),
          'source': _source,
          'family_id': _familyId,
          if (_campaignCtrl.text.trim().isNotEmpty) 'campaign': _campaignCtrl.text.trim(),
          if (_topicCtrl.text.trim().isNotEmpty) 'topic': _topicCtrl.text.trim(),
          if (_externalRefCtrl.text.trim().isNotEmpty) 'external_reference': _externalRefCtrl.text.trim(),
        });
      }
      setState(() => _saved = link);
      widget.onSaved();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = _isEdit ? 'ویرایش لینک ناموفق بود.' : 'ساخت لینک ناموفق بود.');
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_saved != null && !_isEdit) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'لینک آماده است. آن را در بیو، استوری، دایرکت یا کمپین قرار دهید.',
            style: TextStyle(color: AppColors.textMuted),
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(AppRadius.tile),
            ),
            child: SelectableText(_saved!.url, style: const TextStyle(fontSize: 13)),
          ),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            label: 'کپی و بستن',
            icon: Icons.copy_rounded,
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _saved!.url));
              if (context.mounted) Navigator.pop(context, true);
            },
          ),
        ],
      );
    }

    if (_saved != null && _isEdit) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('تغییرات ذخیره شد.', style: TextStyle(color: AppColors.success)),
          const SizedBox(height: AppSpacing.md),
          PrimaryButton(
            label: 'بستن',
            onPressed: () => Navigator.pop(context, true),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          _isEdit
              ? 'نام، خانواده مقصد و متادیتای لینک را ویرایش کنید. URL لینک ثابت می‌ماند.'
              : 'هر لینک به یک خانواده مشخص وصل می‌شود. کسی که از ریلز، استوری یا کمپین با این لینک بیاید مستقیم همان خانواده را می‌گیرد.',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(
            labelText: 'نام لینک',
            hintText: 'مثلاً: ریل 482 — ترس از شروع',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        if (_familiesLoading)
          const LinearProgressIndicator()
        else if (_families.isEmpty)
          const Text('ابتدا یک خانواده بسازید.', style: TextStyle(color: AppColors.warning))
        else
          DropdownButtonFormField<int>(
            value: _familyId,
            decoration: const InputDecoration(labelText: 'خانواده مقصد'),
            items: _families
                .map((f) => DropdownMenuItem(value: f.id, child: Text(f.internalName)))
                .toList(),
            onChanged: (v) => setState(() => _familyId = v),
          ),
        if (!_isEdit) ...[
          const SizedBox(height: AppSpacing.md),
          DropdownButtonFormField<String>(
            value: _source,
            decoration: const InputDecoration(labelText: 'منبع ورود'),
            items: entrySourceLabels.entries
                .where((e) => e.key != 'direct')
                .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                .toList(),
            onChanged: (v) => setState(() => _source = v ?? _source),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _externalRefCtrl,
            decoration: const InputDecoration(
              labelText: 'شناسه محتوا (اختیاری)',
              hintText: 'reel-482',
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _campaignCtrl,
          decoration: const InputDecoration(
            labelText: 'کمپین (اختیاری)',
            hintText: 'reel-482',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _topicCtrl,
          decoration: const InputDecoration(
            labelText: 'موضوع / توضیح (اختیاری)',
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.md),
          Text(_error!, style: const TextStyle(color: AppColors.error)),
        ],
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: _pending
              ? (_isEdit ? 'در حال ذخیره…' : 'در حال ساخت…')
              : (_isEdit ? 'ذخیره تغییرات' : 'ساخت لینک'),
          onPressed: (_pending || _families.isEmpty) ? null : _submit,
        ),
      ],
    );
  }
}
