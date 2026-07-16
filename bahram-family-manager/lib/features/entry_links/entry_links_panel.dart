import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/features/entry_links/entry_link_card.dart';
import 'package:bahram_family_manager/features/entry_links/entry_link_form.dart';
import 'package:bahram_family_manager/features/entry_links/entry_links_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

/// Embeddable entry-links manager — analytics, family detail, etc.
class EntryLinksPanel extends StatefulWidget {
  const EntryLinksPanel({
    super.key,
    this.familyId,
    this.familyName,
    this.maxItems = 5,
    this.showViewAll = true,
  });

  final int? familyId;
  final String? familyName;
  final int maxItems;
  final bool showViewAll;

  @override
  State<EntryLinksPanel> createState() => _EntryLinksPanelState();
}

class _EntryLinksPanelState extends State<EntryLinksPanel> {
  Future<List<EntryLinkModel>>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant EntryLinksPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.familyId != widget.familyId) _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.listEntryLinks(
            familyId: widget.familyId,
          );
    });
  }

  Future<void> _create() async {
    final created = await showAppBottomSheet<bool>(
      context: context,
      title: 'لینک ورود جدید',
      subtitle: widget.familyName != null
          ? 'لینک به خانواده «${widget.familyName}» وصل می‌شود.'
          : 'لینک را به یک خانواده مشخص وصل کنید.',
      scrollable: true,
      initialChildSize: 0.75,
      child: EntryLinkForm(
        initialFamilyId: widget.familyId,
        onSaved: _load,
      ),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.familyId != null ? 'لینک‌های ورود این خانواده' : 'لینک‌های ورود اختصاصی';

    return PanelSectionCard(
      title: title,
      icon: Icons.link_rounded,
      trailing: IconButton(
        tooltip: 'لینک جدید',
        onPressed: _create,
        icon: const Icon(Icons.add_link_rounded),
      ),
      child: FutureBuilder<List<EntryLinkModel>>(
        future: _future,
        builder: (context, snapshot) => AsyncBody<List<EntryLinkModel>>(
          snapshot: snapshot,
          emptyMessage: 'هنوز لینک ورودی ساخته نشده.',
          builder: (context, links) {
            if (links.isEmpty) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const EmptyState(
                    icon: Icons.link_rounded,
                    title: 'لینک ورود ندارید',
                    subtitle: 'برای هر ریلز، استوری یا کمپین یک لینک اختصاصی بسازید و به خانواده مقصد وصل کنید.',
                  ),
                  const SizedBox(height: AppSpacing.md),
                  OutlinedButton.icon(
                    onPressed: _create,
                    icon: const Icon(Icons.add_link_rounded),
                    label: const Text('ساخت اولین لینک'),
                  ),
                ],
              );
            }

            final visible = links.take(widget.maxItems).toList();
            final hasMore = links.length > widget.maxItems;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'هر لینک کاربر را مستقیم به خانواده‌ای که انتخاب کرده‌اید هدایت می‌کند.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                ),
                const SizedBox(height: AppSpacing.md),
                ...visible.map(
                  (link) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: EntryLinkCard(
                      link: link,
                      compact: widget.familyId != null,
                      onChanged: _load,
                    ),
                  ),
                ),
                if (hasMore || widget.showViewAll)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const EntryLinksScreen()),
                        );
                      },
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: Text(hasMore ? 'مشاهده همه (${links.length})' : 'مدیریت کامل لینک‌ها'),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
