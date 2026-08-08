import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/entry_links/entry_link_form.dart';
import 'package:bahram_family_manager/features/families/family_members_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';

class EntryLinkCard extends StatefulWidget {
  const EntryLinkCard({
    super.key,
    required this.link,
    required this.onChanged,
    this.compact = false,
  });

  final EntryLinkModel link;
  final VoidCallback onChanged;
  final bool compact;

  @override
  State<EntryLinkCard> createState() => _EntryLinkCardState();
}

class _EntryLinkCardState extends State<EntryLinkCard> {
  var _deactivating = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.link.url));
    if (mounted) showAppSnackBar(context, 'لینک کپی شد.');
  }

  Future<void> _edit() async {
    if (_deactivating) return;
    final saved = await showAppBottomSheet<bool>(
      context: context,
      title: 'ویرایش لینک ورود',
      subtitle: widget.link.name,
      scrollable: true,
      initialChildSize: 0.75,
      child: EntryLinkForm(link: widget.link, onSaved: widget.onChanged),
    );
    if (saved == true) widget.onChanged();
  }

  Future<void> _deactivate() async {
    if (_deactivating || !widget.link.isActive) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('غیرفعال کردن لینک'),
        content: Text('لینک «${widget.link.name}» غیرفعال شود؟ URL دیگر برای عضوگیری جدید توصیه نمی‌شود.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('انصراف')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('غیرفعال', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final manager = context.read<AppState>().manager;
    setState(() => _deactivating = true);
    try {
      await manager.deactivateEntryLink(widget.link.id);
      if (mounted) {
        showAppSnackBar(context, 'لینک غیرفعال شد.');
        widget.onChanged();
      }
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'عملیات ناموفق بود.');
    } finally {
      if (mounted) setState(() => _deactivating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final link = widget.link;
    final sourceLabel = link.sourceLabel ?? labelOf(entrySourceLabels, link.source);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  link.name,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: widget.compact ? 14 : 16,
                    color: link.isActive ? AppColors.text : AppColors.textMuted,
                  ),
                ),
              ),
              if (!link.isActive)
                const Chip(
                  label: Text('غیرفعال', style: TextStyle(fontSize: 11)),
                  visualDensity: VisualDensity.compact,
                ),
              if (_deactivating)
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              else
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert_rounded, size: 20),
                  onSelected: (action) => switch (action) {
                    'edit' => _edit(),
                    'copy' => _copy(),
                    'deactivate' => link.isActive ? _deactivate() : null,
                    _ => null,
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(value: 'edit', child: Text('ویرایش')),
                    const PopupMenuItem(value: 'copy', child: Text('کپی لینک')),
                    if (link.isActive)
                      const PopupMenuItem(
                        value: 'deactivate',
                        child: Text('غیرفعال کردن', style: TextStyle(color: AppColors.error)),
                      ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(sourceLabel, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          if (link.familyName != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              'خانواده: ${link.familyName}',
              style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              _MiniStat(label: 'کل ورودی', value: link.joinsTotal),
              const SizedBox(width: AppSpacing.md),
              _MiniStat(label: '۳۰ روز اخیر', value: link.joinsPeriod),
            ],
          ),
          if (!widget.compact) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.surfaceSoft,
                borderRadius: BorderRadius.circular(AppRadius.tile),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                link.url,
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _deactivating ? null : _copy,
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('کپی'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _deactivating
                      ? null
                      : () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => FamilyMembersScreen(
                                familyId: link.familyId,
                                familyName: link.familyName,
                                entryLinkId: link.id,
                                title: 'ورودی‌های «${link.name}»',
                                showFamilyName: link.familyId == null,
                                showAttribution: true,
                              ),
                            ),
                          );
                        },
                  icon: const Icon(Icons.people_rounded, size: 18),
                  label: const Text('اعضا'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          toFaDigits(value.toString()),
          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary),
        ),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }
}
