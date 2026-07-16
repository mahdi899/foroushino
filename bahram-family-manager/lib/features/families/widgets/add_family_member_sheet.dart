import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

Future<bool?> showAddFamilyMemberSheet({
  required BuildContext context,
  required int familyId,
  String? familyName,
}) {
  return showAppBottomSheet<bool>(
    context: context,
    title: 'افزودن عضو',
    subtitle: familyName,
    child: _AddFamilyMemberForm(familyId: familyId),
  );
}

class _AddFamilyMemberForm extends StatefulWidget {
  const _AddFamilyMemberForm({required this.familyId});

  final int familyId;

  @override
  State<_AddFamilyMemberForm> createState() => _AddFamilyMemberFormState();
}

class _AddFamilyMemberFormState extends State<_AddFamilyMemberForm> {
  final _mobileCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  bool _pending = false;

  @override
  void dispose() {
    _mobileCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final mobile = _mobileCtrl.text.trim();
    if (mobile.isEmpty) {
      showAppSnackBar(context, 'شماره موبایل را وارد کنید.');
      return;
    }

    setState(() => _pending = true);
    try {
      await context.read<AppState>().manager.addMember(
            familyId: widget.familyId,
            mobile: mobile,
            name: _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
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
          controller: _mobileCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'شماره موبایل',
            hintText: '09123456789',
            prefixIcon: Icon(Icons.phone_rounded),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(
            labelText: 'نام (اختیاری)',
            hintText: 'اگر کاربر جدید است، نام را وارد کنید',
            prefixIcon: Icon(Icons.person_outline_rounded),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        PrimaryButton(
          label: 'افزودن عضو',
          icon: Icons.person_add_rounded,
          loading: _pending,
          onPressed: _pending ? null : _submit,
        ),
      ],
    );
  }
}
