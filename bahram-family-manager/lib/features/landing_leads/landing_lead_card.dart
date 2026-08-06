import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/chips/status_chip.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';

class LandingLeadCard extends StatelessWidget {
  const LandingLeadCard({
    super.key,
    required this.lead,
    required this.statusLabel,
    required this.canManage,
    required this.onCreateFamily,
    required this.onAddToFamily,
  });

  final LandingLeadModel lead;
  final String statusLabel;
  final bool canManage;
  final VoidCallback onCreateFamily;
  final VoidCallback onAddToFamily;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final assigned = lead.isAssigned;

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: scheme.primary.withValues(alpha: 0.12),
                child: Icon(Icons.person_rounded, color: scheme.primary),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lead.name,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      lead.phoneMasked ?? lead.phone ?? '—',
                      style: Theme.of(context).textTheme.bodyMedium,
                      textDirection: TextDirection.ltr,
                    ),
                    if (lead.landingPageTitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        lead.landingPageTitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ],
                ),
              ),
              StatusChip(
                label: statusLabel,
                color: assigned ? AppColors.success : AppColors.info,
                icon: assigned ? Icons.check_circle_outline_rounded : Icons.fiber_new_rounded,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            formatDateTime(lead.createdAt),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
          ),
          if (assigned && lead.familyName != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'خانواده: ${lead.familyName}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.primary),
            ),
          ],
          if (canManage) ...[
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onAddToFamily,
                    icon: const Icon(Icons.group_add_rounded, size: 18),
                    label: const Text('افزودن به خانواده'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: PrimaryButton(
                    label: 'ساخت خانواده',
                    icon: Icons.add_home_work_rounded,
                    onPressed: onCreateFamily,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
