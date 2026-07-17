import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

class PostActionResultsPanel extends StatefulWidget {
  const PostActionResultsPanel({super.key, required this.postId});

  final int postId;

  @override
  State<PostActionResultsPanel> createState() => _PostActionResultsPanelState();
}

class _PostActionResultsPanelState extends State<PostActionResultsPanel> {
  Future<List<FamilyActionResultModel>>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.getPostActionResults(widget.postId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return PanelSectionCard(
      title: 'نتایج اکشن و نظرسنجی',
      icon: Icons.poll_rounded,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'خروجی Excel',
            onPressed: () async {
              try {
                await context.read<AppState>().manager.downloadActionResultsExport(widget.postId);
                if (context.mounted) {
                  showAppSnackBar(context, 'فایل CSV دانلود شد.');
                }
              } catch (e) {
                if (context.mounted) showAppSnackBar(context, messageOf(e));
              }
            },
            icon: const Icon(Icons.download_rounded),
          ),
          IconButton(
            tooltip: 'بروزرسانی',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      child: FutureBuilder<List<FamilyActionResultModel>>(
        future: _future,
        builder: (context, snapshot) => AsyncBody<List<FamilyActionResultModel>>(
          snapshot: snapshot,
          emptyMessage: 'هنوز پاسخی ثبت نشده.',
          emptyIcon: Icons.how_to_vote_outlined,
          builder: (context, results) {
            if (results.isEmpty || results.every((r) => r.responseCount == 0)) {
              return const EmptyState(
                title: 'هنوز پاسخی ثبت نشده',
                subtitle: 'وقتی اعضا رأی بدهند یا اکشن را تکمیل کنند اینجا نمایش داده می‌شود.',
                icon: Icons.how_to_vote_outlined,
              );
            }
            return Column(
              children: [
                for (final result in results) ...[
                  _ActionResultCard(result: result),
                  if (result != results.last) const SizedBox(height: AppSpacing.lg),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ActionResultCard extends StatelessWidget {
  const _ActionResultCard({required this.result});

  final FamilyActionResultModel result;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return GlassPanel(
      borderRadius: 18,
      blur: 20,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(result.prompt, style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  labelOf(actionTypeLabels, result.type),
                  style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '${toFaDigits(result.responseCount.toString())} پاسخ'
            '${result.activeUntil != null ? ' · تا ${formatDateTime(result.activeUntil)}' : ''}'
            '${result.isOpen ? '' : ' · بسته شده'}',
            style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.6), fontSize: 12),
          ),
          if (result.stats != null && result.stats!.options.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            for (final option in result.stats!.options) ...[
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(child: Text(option.label)),
                  Text('${toFaDigits(option.count.toString())} (${toFaDigits(option.percent.toString())}٪)'),
                ],
              ),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: result.stats!.total > 0 ? option.count / result.stats!.total : 0,
                  minHeight: 8,
                  backgroundColor: scheme.outline.withValues(alpha: 0.2),
                  color: AppColors.primary,
                ),
              ),
            ],
          ],
          if (result.responses.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.sm),
            Text('شرکت‌کنندگان', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: AppSpacing.sm),
            for (final row in result.responses)
              _ResponderRow(response: row),
          ],
        ],
      ),
    );
  }
}

class _ResponderRow extends StatelessWidget {
  const _ResponderRow({required this.response});

  final FamilyActionResponseRowModel response;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final mobile = response.mobile;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(response.name ?? 'بدون نام', style: const TextStyle(fontWeight: FontWeight.w700)),
                if (mobile != null && mobile.isNotEmpty)
                  Row(
                    children: [
                      SelectableText(
                        toFaDigits(mobile),
                        style: TextStyle(
                          color: scheme.onSurface.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      IconButton(
                        tooltip: 'کپی شماره',
                        visualDensity: VisualDensity.compact,
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: mobile));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('شماره کپی شد')),
                          );
                        },
                        icon: const Icon(Icons.copy_rounded, size: 16),
                      ),
                    ],
                  ),
                if (response.familyName != null)
                  Text(response.familyName!, style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.55), fontSize: 11)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (response.valueLabel != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: scheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    response.valueLabel!,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              if (response.respondedAt != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    formatDateTime(response.respondedAt!),
                    style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.45), fontSize: 10),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
