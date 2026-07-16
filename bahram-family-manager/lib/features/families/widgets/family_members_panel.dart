import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/families/widgets/add_family_member_sheet.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class FamilyMembersPanel extends StatefulWidget {
  const FamilyMembersPanel({
    super.key,
    this.familyId,
    this.familyName,
    this.showFamilyName = false,
    this.compact = false,
    this.embeddedInScrollView = false,
  });

  final int? familyId;
  final String? familyName;
  final bool showFamilyName;
  final bool compact;
  /// When true, the member list uses [shrinkWrap] so it can live inside a parent [ListView].
  final bool embeddedInScrollView;

  @override
  State<FamilyMembersPanel> createState() => _FamilyMembersPanelState();
}

class _FamilyMembersPanelState extends State<FamilyMembersPanel> {
  final _searchCtrl = TextEditingController();
  Future<PaginatedResult<FamilyMemberModel>>? _future;

  bool get _canManage => widget.familyId != null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant FamilyMembersPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.familyId != widget.familyId || oldWidget.showFamilyName != widget.showFamilyName) {
      _load();
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.listMembers(
            familyId: widget.familyId,
            search: _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
          );
    });
  }

  Future<void> _addMember() async {
    if (!_canManage) return;
    final added = await showAddFamilyMemberSheet(
      context: context,
      familyId: widget.familyId!,
      familyName: widget.familyName,
    );
    if (added == true) _load();
  }

  Future<void> _removeMember(FamilyMemberModel member) async {
    if (!_canManage) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('حذف عضو'),
        content: Text('${member.name ?? 'این عضو'} از خانواده حذف شود؟'),
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

    try {
      await context.read<AppState>().manager.removeMember(
            familyId: widget.familyId!,
            membershipId: member.id,
          );
      if (mounted) {
        showAppSnackBar(context, 'عضو از خانواده حذف شد.');
        _load();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!widget.compact) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  widget.familyId == null ? 'اعضای کانال خانواده' : 'اعضای این خانواده',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
              ),
              if (_canManage)
                FilledButton.icon(
                  onPressed: _addMember,
                  icon: const Icon(Icons.person_add_rounded, size: 18),
                  label: const Text('افزودن'),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
        ],
        TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'جستجو نام یا موبایل',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded),
            ),
            isDense: widget.compact,
          ),
          onSubmitted: (_) => _load(),
        ),
        if (_canManage && widget.compact) ...[
          const SizedBox(height: AppSpacing.sm),
          PrimaryButton(
            label: 'افزودن عضو',
            icon: Icons.person_add_rounded,
            onPressed: _addMember,
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        if (widget.embeddedInScrollView)
          _MembersList(
            future: _future,
            showFamilyName: widget.showFamilyName,
            canManage: _canManage,
            embeddedInScrollView: true,
            onAdd: _addMember,
            onRemove: _removeMember,
          )
        else
          Expanded(
            child: _MembersList(
              future: _future,
              showFamilyName: widget.showFamilyName,
              canManage: _canManage,
              embeddedInScrollView: false,
              onAdd: _addMember,
              onRemove: _removeMember,
            ),
          ),
      ],
    );
  }
}

class _MembersList extends StatelessWidget {
  const _MembersList({
    required this.future,
    required this.showFamilyName,
    required this.canManage,
    required this.embeddedInScrollView,
    required this.onAdd,
    required this.onRemove,
  });

  final Future<PaginatedResult<FamilyMemberModel>>? future;
  final bool showFamilyName;
  final bool canManage;
  final bool embeddedInScrollView;
  final Future<void> Function() onAdd;
  final Future<void> Function(FamilyMemberModel member) onRemove;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<PaginatedResult<FamilyMemberModel>>(
      future: future,
      builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilyMemberModel>>(
        snapshot: snapshot,
        emptyMessage: 'عضوی یافت نشد.',
        emptyIcon: Icons.people_outline_rounded,
        builder: (context, data) {
          if (data.items.isEmpty) {
            return EmptyState(
              title: 'عضوی یافت نشد',
              subtitle: canManage ? 'با دکمه افزودن، عضو جدید اضافه کنید.' : 'هنوز کسی به این خانواده نپیوسته.',
              icon: Icons.people_outline_rounded,
              actionLabel: canManage ? 'افزودن عضو' : null,
              onAction: canManage ? onAdd : null,
            );
          }
          return ListView.separated(
            shrinkWrap: embeddedInScrollView,
            physics: embeddedInScrollView ? const NeverScrollableScrollPhysics() : null,
            itemCount: data.items.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final member = data.items[index];
              return _MemberTile(
                member: member,
                showFamilyName: showFamilyName,
                canRemove: canManage,
                onRemove: () => onRemove(member),
              );
            },
          );
        },
      ),
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({
    required this.member,
    required this.showFamilyName,
    required this.canRemove,
    required this.onRemove,
  });

  final FamilyMemberModel member;
  final bool showFamilyName;
  final bool canRemove;
  final VoidCallback onRemove;

  String? get _displayMobile {
    final mobile = member.displayMobile;
    if (mobile == null || mobile.isEmpty) return null;
    return toFaDigits(mobile);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initial = member.name?.isNotEmpty == true ? member.name!.substring(0, 1) : '؟';

    return GlassPanel(
      borderRadius: 18,
      blur: 20,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primarySoft,
            child: Text(initial, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(member.name ?? 'بدون نام', style: const TextStyle(fontWeight: FontWeight.w700)),
                if (_displayMobile != null)
                  Row(
                    children: [
                      Expanded(
                        child: SelectableText(
                          _displayMobile!,
                          style: TextStyle(
                            color: scheme.onSurface.withValues(alpha: 0.9),
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'کپی شماره',
                        visualDensity: VisualDensity.compact,
                        onPressed: () {
                          final raw = member.displayMobile;
                          if (raw == null) return;
                          Clipboard.setData(ClipboardData(text: raw));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('شماره کپی شد')),
                          );
                        },
                        icon: Icon(Icons.copy_rounded, size: 18, color: scheme.primary),
                      ),
                    ],
                  ),
                if (showFamilyName && member.familyName != null)
                  Text(member.familyName!, style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.55), fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (member.joinedAt != null)
                Text(formatDateTime(member.joinedAt!), style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 11)),
              if (member.entrySource != null)
                Text(
                  labelOf(entrySourceLabels, member.entrySource!),
                  style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                ),
            ],
          ),
          if (canRemove) ...[
            const SizedBox(width: AppSpacing.xs),
            IconButton(
              tooltip: 'حذف از خانواده',
              onPressed: onRemove,
              icon: const Icon(Icons.person_remove_rounded, color: AppColors.error),
            ),
          ],
        ],
      ),
    );
  }
}
