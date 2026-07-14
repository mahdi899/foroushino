import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';

class FamilyPickerSheet extends StatefulWidget {
  const FamilyPickerSheet({super.key, required this.initialSelection});

  final Set<int> initialSelection;

  @override
  State<FamilyPickerSheet> createState() => _FamilyPickerSheetState();
}

class _FamilyPickerSheetState extends State<FamilyPickerSheet> {
  final _searchCtrl = TextEditingController();
  late Set<int> _selected;
  Future<PaginatedResult<FamilySummaryModel>>? _future;
  Future<List<AudienceSuggestion>>? _suggestionsFuture;

  @override
  void initState() {
    super.initState();
    _selected = {...widget.initialSelection};
    _search();
    _suggestionsFuture = context.read<AppState>().manager.audienceSuggestions();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _search() {
    setState(() {
      _future = context.read<AppState>().manager.listFamilies(search: _searchCtrl.text);
    });
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('انتخاب خانواده‌ها', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.md),
              FutureBuilder<List<AudienceSuggestion>>(
                future: _suggestionsFuture,
                builder: (context, snapshot) {
                  final suggestions = snapshot.data ?? const [];
                  if (suggestions.isEmpty) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: suggestions
                          .map(
                            (s) => ActionChip(
                              avatar: const Icon(Icons.auto_awesome_rounded, size: 16, color: Color(0xFF008C96)),
                              label: Text('${s.label} (${s.familyIds.length})'),
                              onPressed: () => setState(() => _selected.addAll(s.familyIds)),
                            ),
                          )
                          .toList(),
                    ),
                  );
                },
              ),
              TextField(
                controller: _searchCtrl,
                decoration: const InputDecoration(
                  labelText: 'جستجوی خانواده',
                  prefixIcon: Icon(Icons.search_rounded),
                  isDense: true,
                ),
                onSubmitted: (_) => _search(),
              ),
              const SizedBox(height: AppSpacing.sm),
              if (_selected.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: StatusChip(
                    label: '${toFaDigits(_selected.length.toString())} انتخاب‌شده',
                    color: const Color(0xFF008C96),
                    icon: Icons.check_rounded,
                  ),
                ),
              Expanded(
                child: FutureBuilder<PaginatedResult<FamilySummaryModel>>(
                  future: _future,
                  builder: (context, snapshot) => AsyncBody<PaginatedResult<FamilySummaryModel>>(
                    snapshot: snapshot,
                    emptyMessage: 'خانواده‌ای یافت نشد.',
                    builder: (context, data) {
                      final families = data.items;
                      return ListView.separated(
                        controller: scrollController,
                        itemCount: families.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final f = families[index];
                          final selected = _selected.contains(f.id);
                          return CheckboxListTile(
                            value: selected,
                            activeColor: const Color(0xFF008C96),
                            title: Text(f.internalName, style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${toFaDigits(f.memberCount.toString())} عضو'),
                            onChanged: (v) => setState(() {
                              if (v == true) {
                                _selected.add(f.id);
                              } else {
                                _selected.remove(f.id);
                              }
                            }),
                          );
                        },
                      );
                    },
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              PrimaryButton(
                label: 'تأیید (${toFaDigits(_selected.length.toString())} انتخاب‌شده)',
                onPressed: () => Navigator.of(context).pop(_selected),
              ),
            ],
          ),
        );
      },
    );
  }
}

Future<Set<int>?> showFamilyPickerSheet(BuildContext context, Set<int> initialSelection) {
  return showModalBottomSheet<Set<int>>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => FamilyPickerSheet(initialSelection: initialSelection),
  );
}
