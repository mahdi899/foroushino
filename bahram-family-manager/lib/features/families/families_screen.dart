import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/families/family_detail_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/feedback/empty_state.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';

class FamiliesScreen extends StatefulWidget {
  const FamiliesScreen({super.key});

  @override
  State<FamiliesScreen> createState() => _FamiliesScreenState();
}

class _FamiliesScreenState extends State<FamiliesScreen> {
  final _searchCtrl = TextEditingController();
  String? _lifecycle;
  Future<PaginatedResult<FamilySummaryModel>>? _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = context.read<AppState>().manager.listFamilies(search: _searchCtrl.text, lifecycle: _lifecycle);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('خانواده‌ها')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                TextField(
                  controller: _searchCtrl,
                  decoration: const InputDecoration(
                    labelText: 'جستجو بر اساس نام داخلی',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                  onSubmitted: (_) => _load(),
                ),
                const SizedBox(height: AppSpacing.md),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _LifecycleChip(label: 'همه', selected: _lifecycle == null, onTap: () => setState(() { _lifecycle = null; _load(); })),
                      ...lifecycleLabels.entries.map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(right: AppSpacing.sm),
                          child: _LifecycleChip(
                            label: e.value,
                            selected: _lifecycle == e.key,
                            onTap: () => setState(() {
                              _lifecycle = e.key;
                              _load();
                            }),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _load(),
              child: FutureBuilder<PaginatedResult<FamilySummaryModel>>(
                future: _future,
                builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilySummaryModel>>(
                  snapshot: snapshot,
                  emptyMessage: 'خانواده‌ای یافت نشد.',
                  builder: (context, data) {
                    final families = data.items;
                    if (families.isEmpty) {
                      return ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [EmptyState(title: 'خانواده‌ای یافت نشد', icon: Icons.groups_outlined)],
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: families.length,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final f = families[index];
                        final fill = f.capacityTarget > 0 ? (f.memberCount / f.capacityTarget).clamp(0, 1.5) : 0.0;
                        return AppCard(
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => FamilyDetailScreen(familyId: f.id)),
                          ),
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 22,
                                backgroundColor: AppColors.primarySoft,
                                child: Text(
                                  f.internalName.isNotEmpty ? f.internalName.substring(0, 1) : 'خ',
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(f.internalName, style: const TextStyle(fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${toFaDigits(f.memberCount.toString())} / ${toFaDigits(f.capacityTarget.toString())} عضو',
                                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                                    ),
                                    const SizedBox(height: AppSpacing.sm),
                                    StatusChip(
                                      label: labelOf(lifecycleLabels, f.lifecycle),
                                      color: AppColors.accent,
                                      icon: Icons.circle_rounded,
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(
                                width: 44,
                                height: 44,
                                child: CircularProgressIndicator(
                                  value: fill.toDouble().clamp(0, 1),
                                  backgroundColor: AppColors.border,
                                  color: fill >= 1 ? AppColors.warning : AppColors.primary,
                                  strokeWidth: 5,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LifecycleChip extends StatelessWidget {
  const _LifecycleChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      selectedColor: AppColors.primarySoft,
      labelStyle: TextStyle(
        color: selected ? AppColors.primary : AppColors.textMuted,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
      ),
    );
  }
}
