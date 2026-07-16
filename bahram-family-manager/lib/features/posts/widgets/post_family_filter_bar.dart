import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class PostFamilyFilterBar extends StatelessWidget {
  const PostFamilyFilterBar({
    super.key,
    required this.families,
    required this.selectedFamilyId,
    required this.onChanged,
  });

  final List<FamilySummaryModel> families;
  final int? selectedFamilyId;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return GlassPanel(
      borderRadius: 16,
      blur: 18,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.filter_alt_rounded, size: 18, color: scheme.primary),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'فیلتر کانال / خانواده',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _FamilyFilterChip(
                  label: 'همه کانال‌ها',
                  selected: selectedFamilyId == null,
                  onTap: () => onChanged(null),
                ),
                ...families.map(
                  (family) => Padding(
                    padding: const EdgeInsetsDirectional.only(start: AppSpacing.sm),
                    child: _FamilyFilterChip(
                      label: family.internalName,
                      selected: selectedFamilyId == family.id,
                      onTap: () => onChanged(family.id),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FamilyFilterChip extends StatelessWidget {
  const _FamilyFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      avatar: Icon(
        selected ? Icons.check_circle_rounded : Icons.groups_rounded,
        size: 18,
        color: selected ? Colors.white : AppColors.primary,
      ),
      selectedColor: AppColors.primary,
      backgroundColor: scheme.surface.withValues(alpha: 0.35),
      labelStyle: TextStyle(
        color: selected ? Colors.white : scheme.onSurface,
        fontWeight: FontWeight.w600,
        fontSize: 13,
      ),
      side: BorderSide(
        color: selected ? Colors.transparent : scheme.outline.withValues(alpha: 0.35),
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
    );
  }
}
