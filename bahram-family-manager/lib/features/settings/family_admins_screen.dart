import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

class FamilyAdminsScreen extends StatefulWidget {
  const FamilyAdminsScreen({super.key});

  @override
  State<FamilyAdminsScreen> createState() => _FamilyAdminsScreenState();
}

class _FamilyAdminsScreenState extends State<FamilyAdminsScreen> {
  Future<List<FamilyManagerAdmin>>? _future;
  var _creating = false;
  var _busy = false;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _reload();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _mobileCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _future = context.read<AppState>().manager.listFamilyAdmins();
    });
  }

  Future<void> _createAdmin() async {
    if (_nameCtrl.text.trim().isEmpty ||
        _emailCtrl.text.trim().isEmpty ||
        _mobileCtrl.text.trim().isEmpty ||
        _passwordCtrl.text.length < 8) {
      showAppSnackBar(context, 'نام، ایمیل، موبایل و رمز (حداقل ۸ کاراکتر) را کامل کنید.');
      return;
    }

    setState(() => _creating = true);
    try {
      await context.read<AppState>().manager.createFamilyAdmin(
            name: _nameCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
            mobile: _mobileCtrl.text.trim(),
            password: _passwordCtrl.text,
          );
      _nameCtrl.clear();
      _emailCtrl.clear();
      _mobileCtrl.clear();
      _passwordCtrl.clear();
      if (mounted) {
        showAppSnackBar(context, 'مدیر خانواده ساخته شد.');
        _reload();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _toggleSuspend(FamilyManagerAdmin admin) async {
    setState(() => _busy = true);
    try {
      await context.read<AppState>().manager.setFamilyAdminStatus(
            admin.id,
            admin.isActive ? 'suspended' : 'active',
          );
      if (mounted) {
        showAppSnackBar(context, admin.isActive ? 'حساب معلق شد.' : 'حساب فعال شد.');
        _reload();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resetPassword(FamilyManagerAdmin admin) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('ریست رمز'),
        content: TextField(
          controller: ctrl,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'رمز جدید (حداقل ۸ کاراکتر)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('انصراف')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('ذخیره')),
        ],
      ),
    );
    if (ok != true || ctrl.text.length < 8) return;

    setState(() => _busy = true);
    try {
      await context.read<AppState>().manager.resetFamilyAdminPassword(admin.id, ctrl.text);
      if (mounted) showAppSnackBar(context, 'رمز عبور به‌روز شد.');
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      ctrl.dispose();
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteAdmin(FamilyManagerAdmin admin) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف مدیر'),
        content: Text('«${admin.name}» حذف شود؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('انصراف')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _busy = true);
    try {
      await context.read<AppState>().manager.deleteFamilyAdmin(admin.id);
      if (mounted) {
        showAppSnackBar(context, 'مدیر حذف شد.');
        _reload();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('مدیران خانواده')),
      body: FutureBuilder<List<FamilyManagerAdmin>>(
        future: _future,
        builder: (context, snapshot) => AsyncBody<List<FamilyManagerAdmin>>(
          snapshot: snapshot,
          emptyMessage: 'هنوز مدیر دیگری ثبت نشده.',
          builder: (context, admins) {
            return ListView(
              padding: AppBreakpoints.pagePadding(context).copyWith(
                bottom: AppBreakpoints.pagePadding(context).bottom + 24,
              ),
              children: [
                PanelSectionCard(
                  title: 'مدیر جدید',
                  icon: Icons.person_add_alt_1_rounded,
                  child: Column(
                    children: [
                      TextField(
                        controller: _nameCtrl,
                        decoration: const InputDecoration(labelText: 'نام'),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _emailCtrl,
                        decoration: const InputDecoration(labelText: 'ایمیل'),
                        keyboardType: TextInputType.emailAddress,
                        textDirection: TextDirection.ltr,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _mobileCtrl,
                        decoration: const InputDecoration(labelText: 'شماره موبایل'),
                        keyboardType: TextInputType.phone,
                        textDirection: TextDirection.ltr,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextField(
                        controller: _passwordCtrl,
                        decoration: const InputDecoration(labelText: 'رمز عبور'),
                        obscureText: true,
                        textDirection: TextDirection.ltr,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      PrimaryButton(
                        label: 'ساخت مدیر خانواده',
                        loading: _creating,
                        onPressed: _busy ? null : _createAdmin,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                Text(
                  'مدیران فعلی',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: AppSpacing.md),
                ...admins.map((admin) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: GlassPanel(
                        borderRadius: 18,
                        blur: 0,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    admin.name,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                                  ),
                                ),
                                _StatusChip(active: admin.isActive, suspended: admin.isSuspended),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(admin.email, textDirection: TextDirection.ltr),
                            if (admin.mobile != null && admin.mobile!.isNotEmpty)
                              Text(admin.mobile!, textDirection: TextDirection.ltr),
                            const SizedBox(height: AppSpacing.sm),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (admin.canResetPassword)
                                  OutlinedButton.icon(
                                    onPressed: _busy ? null : () => _resetPassword(admin),
                                    icon: const Icon(Icons.lock_reset_rounded, size: 18),
                                    label: const Text('ریست رمز'),
                                  ),
                                if (admin.canSuspend)
                                  OutlinedButton.icon(
                                    onPressed: _busy ? null : () => _toggleSuspend(admin),
                                    icon: Icon(
                                      admin.isActive ? Icons.pause_circle_outline : Icons.play_circle_outline,
                                      size: 18,
                                    ),
                                    label: Text(admin.isActive ? 'معلق' : 'فعال‌سازی'),
                                  ),
                                if (admin.canDelete)
                                  TextButton.icon(
                                    onPressed: _busy ? null : () => _deleteAdmin(admin),
                                    icon: Icon(Icons.delete_outline, size: 18, color: scheme.error),
                                    label: Text('حذف', style: TextStyle(color: scheme.error)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.active, required this.suspended});

  final bool active;
  final bool suspended;

  @override
  Widget build(BuildContext context) {
    final color = active
        ? Colors.green.shade700
        : suspended
            ? Colors.orange.shade800
            : Colors.red.shade700;
    final label = active ? 'فعال' : suspended ? 'معلق' : 'مسدود';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }
}
