import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/features/entry_links/entry_link_card.dart';
import 'package:bahram_family_manager/features/entry_links/entry_link_form.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';

class EntryLinksScreen extends StatefulWidget {
  const EntryLinksScreen({super.key});

  @override
  State<EntryLinksScreen> createState() => _EntryLinksScreenState();
}

class _EntryLinksScreenState extends State<EntryLinksScreen> {
  Future<List<EntryLinkModel>>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.listEntryLinks();
    });
  }

  Future<void> _create() async {
    final created = await showAppBottomSheet<bool>(
      context: context,
      title: 'لینک ورود جدید',
      subtitle: 'لینک را به یک خانواده مشخص وصل کنید تا ورودی‌های ریلز/استوری مستقیم همان‌جا ثبت شوند.',
      scrollable: true,
      initialChildSize: 0.75,
      child: EntryLinkForm(onSaved: _load),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: ManagerAppBar(
        title: const Text('لینک‌های ورود'),
        actions: [
          IconButton(
            tooltip: 'لینک جدید',
            onPressed: _create,
            icon: const Icon(Icons.add_link_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _load(),
        child: FutureBuilder<List<EntryLinkModel>>(
          future: _future,
          builder: (context, snapshot) => AsyncBody<List<EntryLinkModel>>(
            snapshot: snapshot,
            emptyMessage: 'هنوز لینک ورودی ساخته نشده.',
            builder: (context, links) {
              if (links.isEmpty) {
                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    const EmptyState(
                      icon: Icons.link_rounded,
                      title: 'لینک ورود ندارید',
                      subtitle: 'برای ردیابی ورودی ریلز، استوری، دایرکت و… یک لینک اختصاصی بسازید.',
                    ),
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: PrimaryButton(label: 'ساخت لینک ورود', onPressed: _create),
                    ),
                  ],
                );
              }

              return ListView.separated(
                padding: AppBreakpoints.pagePadding(context),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: links.length,
                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) => EntryLinkCard(
                  link: links[index],
                  onChanged: _load,
                ),
              );
            },
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add_link_rounded),
        label: const Text('لینک جدید'),
      ),
    );
  }
}
