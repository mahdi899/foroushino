import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/features/families/family_detail_screen.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

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
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _searchCtrl,
                  decoration: const InputDecoration(labelText: 'جستجو بر اساس نام داخلی', prefixIcon: Icon(Icons.search_rounded)),
                  onSubmitted: (_) => _load(),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _LifecycleChip(label: 'همه', selected: _lifecycle == null, onTap: () => setState(() { _lifecycle = null; _load(); })),
                      ...lifecycleLabels.entries.map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(right: 6),
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
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text(messageOf(snapshot.error!), style: const TextStyle(color: AppColors.error)));
                  }

                  final families = snapshot.data!.items;
                  if (families.isEmpty) {
                    return const Center(child: Text('خانواده‌ای یافت نشد.', style: TextStyle(color: AppColors.textMuted)));
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: families.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final f = families[index];
                      final fill = f.capacityTarget > 0 ? (f.memberCount / f.capacityTarget).clamp(0, 1.5) : 0.0;
                      return Card(
                        child: ListTile(
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => FamilyDetailScreen(familyId: f.id)),
                          ),
                          title: Text(f.internalName, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(
                            '${toFaDigits(f.memberCount.toString())} / ${toFaDigits(f.capacityTarget.toString())} عضو · ${labelOf(lifecycleLabels, f.lifecycle)}',
                          ),
                          trailing: SizedBox(
                            width: 48,
                            child: CircularProgressIndicator(
                              value: fill.toDouble(),
                              backgroundColor: AppColors.border,
                              color: fill >= 1 ? AppColors.warning : AppColors.primary,
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
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
    return ChoiceChip(label: Text(label), selected: selected, onSelected: (_) => onTap());
  }
}
