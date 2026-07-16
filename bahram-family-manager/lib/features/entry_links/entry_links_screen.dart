import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/api/api_exception.dart';
import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/sheets/app_bottom_sheet.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';

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
      subtitle: 'هر لینک منبع ورود را ثبت می‌کند تا در تحلیل‌ها قابل ردیابی باشد.',
      scrollable: true,
      initialChildSize: 0.75,
      child: _CreateEntryLinkForm(onCreated: _load),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: AppBar(
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
                itemBuilder: (context, index) => _EntryLinkCard(link: links[index]),
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

class _EntryLinkCard extends StatelessWidget {
  const _EntryLinkCard({required this.link});

  final EntryLinkModel link;

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: link.url));
    if (context.mounted) showAppSnackBar(context, 'لینک کپی شد.');
  }

  @override
  Widget build(BuildContext context) {
    final sourceLabel = link.sourceLabel ?? labelOf(entrySourceLabels, link.source);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(link.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
              if (!link.isActive)
                const Chip(
                  label: Text('غیرفعال', style: TextStyle(fontSize: 11)),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(sourceLabel, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              _MiniStat(label: 'کل ورودی', value: link.joinsTotal),
              const SizedBox(width: AppSpacing.md),
              _MiniStat(label: '۳۰ روز اخیر', value: link.joinsPeriod),
            ],
          ),
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
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _copy(context),
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('کپی لینک'),
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
        Text(toFaDigits(value.toString()), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }
}

class _CreateEntryLinkForm extends StatefulWidget {
  const _CreateEntryLinkForm({required this.onCreated});

  final VoidCallback onCreated;

  @override
  State<_CreateEntryLinkForm> createState() => _CreateEntryLinkFormState();
}

class _CreateEntryLinkFormState extends State<_CreateEntryLinkForm> {
  final _nameCtrl = TextEditingController();
  final _campaignCtrl = TextEditingController();
  final _topicCtrl = TextEditingController();

  String _source = 'instagram_reel';
  bool _pending = false;
  String? _error;
  EntryLinkModel? _created;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _campaignCtrl.dispose();
    _topicCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_pending) return;
    if (_nameCtrl.text.trim().isEmpty) {
      setState(() => _error = 'نام لینک الزامی است.');
      return;
    }

    setState(() {
      _pending = true;
      _error = null;
    });

    try {
      final link = await context.read<AppState>().manager.createEntryLink({
        'name': _nameCtrl.text.trim(),
        'source': _source,
        if (_campaignCtrl.text.trim().isNotEmpty) 'campaign': _campaignCtrl.text.trim(),
        if (_topicCtrl.text.trim().isNotEmpty) 'topic': _topicCtrl.text.trim(),
      });
      setState(() => _created = link);
      widget.onCreated();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'ساخت لینک ناموفق بود.');
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_created != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('لینک آماده است. آن را در بیو، استوری، دایرکت یا کمپین قرار دهید.', style: TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(AppRadius.tile),
            ),
            child: SelectableText(_created!.url, style: const TextStyle(fontSize: 13)),
          ),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            label: 'کپی و بستن',
            icon: Icons.copy_rounded,
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _created!.url));
              if (context.mounted) Navigator.pop(context, true);
            },
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(
            labelText: 'نام لینک',
            hintText: 'مثلاً: ریل 482 — ترس از شروع',
          ),
        ),
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
          label: _pending ? 'در حال ساخت…' : 'ساخت لینک',
          onPressed: _pending ? null : _submit,
        ),
      ],
    );
  }
}
