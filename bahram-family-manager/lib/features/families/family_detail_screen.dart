import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';

class FamilyDetailScreen extends StatelessWidget {
  const FamilyDetailScreen({super.key, required this.familyId});

  final int familyId;

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: AppBar(title: const Text('جزئیات خانواده')),
      body: FamilyDetailBody(familyId: familyId),
    );
  }
}

/// Embeddable family detail — used in master-detail desktop layout and full-screen mobile.
class FamilyDetailBody extends StatefulWidget {
  const FamilyDetailBody({super.key, required this.familyId});

  final int familyId;

  @override
  State<FamilyDetailBody> createState() => _FamilyDetailBodyState();
}

class _FamilyDetailBodyState extends State<FamilyDetailBody> {
  Future<FamilyDetailModel>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant FamilyDetailBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.familyId != widget.familyId) _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.showFamily(widget.familyId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<FamilyDetailModel>(
      future: _future,
      builder: (context, snapshot) => AsyncBody<FamilyDetailModel>(
        snapshot: snapshot,
        builder: (context, family) => FamilyDetailContent(family: family),
      ),
    );
  }
}

class FamilyDetailContent extends StatelessWidget {
  const FamilyDetailContent({super.key, required this.family});

  final FamilyDetailModel family;

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);

    return ListView(
      padding: AppBreakpoints.pagePadding(context),
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: isDesktop ? 32 : 28,
              backgroundColor: AppColors.primarySoft,
              child: Text(
                family.internalName.isNotEmpty ? family.internalName.substring(0, 1) : 'خ',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                  fontSize: isDesktop ? 24 : 22,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(family.internalName, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: AppSpacing.xs),
                  StatusChip(
                    label: labelOf(lifecycleLabels, family.lifecycle),
                    color: AppColors.primary,
                    icon: Icons.groups_rounded,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 600 ? 3 : 1;
            if (columns == 1) {
              return Column(
                children: [
                  _StatTile(title: 'اعضا', value: toFaDigits(family.memberCount.toString())),
                  const SizedBox(height: AppSpacing.sm),
                  _StatTile(title: 'ظرفیت هدف', value: toFaDigits(family.capacityTarget.toString())),
                  const SizedBox(height: AppSpacing.sm),
                  _StatTile(title: 'عضو جدید (۷ روز)', value: toFaDigits(family.newMembers7d.toString())),
                ],
              );
            }
            return Row(
              children: [
                Expanded(child: _StatTile(title: 'اعضا', value: toFaDigits(family.memberCount.toString()))),
                const SizedBox(width: AppSpacing.md),
                Expanded(child: _StatTile(title: 'ظرفیت هدف', value: toFaDigits(family.capacityTarget.toString()))),
                const SizedBox(width: AppSpacing.md),
                Expanded(child: _StatTile(title: 'عضو جدید (۷ روز)', value: toFaDigits(family.newMembers7d.toString()))),
              ],
            );
          },
        ),
        const SizedBox(height: AppSpacing.xl),
        if (family.dna != null)
          _DnaCard(dna: family.dna!)
        else
          const AppCard(
            child: Text('هنوز DNA خانواده محاسبه نشده.', style: TextStyle(color: AppColors.textMuted)),
          ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary)),
          const SizedBox(height: AppSpacing.xs),
          Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _DnaCard extends StatelessWidget {
  const _DnaCard({required this.dna});

  final FamilyDnaModel dna;

  static const _colors = [AppColors.primary, AppColors.accent, AppColors.gold, AppColors.info, AppColors.success, AppColors.warning];

  @override
  Widget build(BuildContext context) {
    final rows = <(String, double)>[
      ('تعامل صوتی', dna.voiceEngagement),
      ('تعامل ویدیویی', dna.videoEngagement),
      ('نرخ واکنش', dna.reactionRate),
      ('نرخ کامنت', dna.commentRate),
      ('تعهد به اکشن', dna.actionCommitment),
      ('تکمیل اکشن', dna.actionCompletion),
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('DNA خانواده (۷ روز اخیر)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: AppSpacing.lg),
          ...rows.asMap().entries.map(
                (entry) {
                  final color = _colors[entry.key % _colors.length];
                  final r = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(r.$1),
                            Text(faPercent(r.$2 * 100), style: TextStyle(fontWeight: FontWeight.w700, color: color)),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(AppRadius.tile),
                          child: LinearProgressIndicator(
                            value: r.$2.clamp(0, 1),
                            minHeight: 8,
                            backgroundColor: AppColors.border,
                            color: color,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
        ],
      ),
    );
  }
}
