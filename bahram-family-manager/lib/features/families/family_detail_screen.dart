import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class FamilyDetailScreen extends StatefulWidget {
  const FamilyDetailScreen({super.key, required this.familyId});

  final int familyId;

  @override
  State<FamilyDetailScreen> createState() => _FamilyDetailScreenState();
}

class _FamilyDetailScreenState extends State<FamilyDetailScreen> {
  Future<FamilyDetailModel>? _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().manager.showFamily(widget.familyId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('جزئیات خانواده')),
      body: FutureBuilder<FamilyDetailModel>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text(messageOf(snapshot.error!), style: const TextStyle(color: AppColors.error)));
          }

          final family = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(family.internalName, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text(labelOf(lifecycleLabels, family.lifecycle), style: const TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _StatTile(title: 'اعضا', value: toFaDigits(family.memberCount.toString()))),
                  const SizedBox(width: 12),
                  Expanded(child: _StatTile(title: 'ظرفیت هدف', value: toFaDigits(family.capacityTarget.toString()))),
                  const SizedBox(width: 12),
                  Expanded(child: _StatTile(title: 'عضو جدید (۷ روز)', value: toFaDigits(family.newMembers7d.toString()))),
                ],
              ),
              const SizedBox(height: 20),
              if (family.dna != null) _DnaCard(dna: family.dna!) else const Text('هنوز DNA خانواده محاسبه نشده.', style: TextStyle(color: AppColors.textMuted)),
            ],
          );
        },
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 12), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _DnaCard extends StatelessWidget {
  const _DnaCard({required this.dna});

  final FamilyDnaModel dna;

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

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('DNA خانواده (۷ روز اخیر)', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            ...rows.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(r.$1),
                        Text(faPercent(r.$2 * 100), style: const TextStyle(fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(value: r.$2.clamp(0, 1), minHeight: 8),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
