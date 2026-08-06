import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

Future<int?> showFamilySinglePickerSheet(BuildContext context) {
  return showAppBottomSheet<int>(
    context: context,
    title: 'انتخاب خانواده',
    subtitle: 'ثبت‌نام لندینگ به این خانواده اضافه می‌شود.',
    scrollable: true,
    initialChildSize: 0.75,
    child: const _FamilySinglePickerForm(),
  );
}

class _FamilySinglePickerForm extends StatefulWidget {
  const _FamilySinglePickerForm();

  @override
  State<_FamilySinglePickerForm> createState() => _FamilySinglePickerFormState();
}

class _FamilySinglePickerFormState extends State<_FamilySinglePickerForm> {
  final _searchCtrl = TextEditingController();
  Future<PaginatedResult<FamilySummaryModel>>? _future;
  int? _selectedId;

  @override
  void initState() {
    super.initState();
    _search();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _search() {
    setState(() {
      _future = context.read<AppState>().manager.listFamilies(
            search: _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _searchCtrl,
          decoration: const InputDecoration(
            labelText: 'جستجوی خانواده',
            prefixIcon: Icon(Icons.search_rounded),
            isDense: true,
          ),
          onSubmitted: (_) => _search(),
        ),
        const SizedBox(height: AppSpacing.md),
        Expanded(
          child: FutureBuilder<PaginatedResult<FamilySummaryModel>>(
            future: _future,
            builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilySummaryModel>>(
              snapshot: snapshot,
              emptyMessage: 'خانواده‌ای یافت نشد.',
              builder: (context, data) {
                final families = data.items;
                return ListView.separated(
                  itemCount: families.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final family = families[index];
                    final selected = _selectedId == family.id;
                    return RadioListTile<int>(
                      value: family.id,
                      groupValue: _selectedId,
                      title: Text(family.internalName, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${toFaDigits(family.memberCount.toString())} عضو'),
                      onChanged: (v) => setState(() => _selectedId = v),
                      selected: selected,
                    );
                  },
                );
              },
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        PrimaryButton(
          label: 'تأیید',
          onPressed: _selectedId == null ? null : () => Navigator.of(context).pop(_selectedId),
        ),
      ],
    );
  }
}
