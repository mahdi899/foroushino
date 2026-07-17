import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/core/debug/api_debug_log.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/features/families/family_detail_cache.dart';
import 'package:bahram_family_manager/features/families/family_members_cache.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

/// Developer tools — only shown in debug/profile builds.
class DebugToolsPanel extends StatefulWidget {
  const DebugToolsPanel({super.key});

  @override
  State<DebugToolsPanel> createState() => _DebugToolsPanelState();
}

class _DebugToolsPanelState extends State<DebugToolsPanel> {
  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();

    return PanelSectionCard(
      title: 'ابزار توسعه‌دهنده',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'لاگ API و پاک‌سازی کش — فقط در حالت debug',
            style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65)),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text('API: ${AppConfig.apiBaseUrl}', style: const TextStyle(fontSize: 12)),
          const SizedBox(height: AppSpacing.sm),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('ثبت درخواست‌های API'),
            value: ApiDebugLog.enabled,
            onChanged: (v) => setState(() => ApiDebugLog.enabled = v),
          ),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              OutlinedButton.icon(
                onPressed: () {
                  FamilyDetailCache.invalidate();
                  FamilyMembersCache.invalidate();
                  showAppSnackBar(context, 'کش خانواده‌ها پاک شد.');
                },
                icon: const Icon(Icons.cached_rounded, size: 18),
                label: const Text('پاک کردن کش خانواده'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  ApiDebugLog.clear();
                  setState(() {});
                  showAppSnackBar(context, 'لاگ API پاک شد.');
                },
                icon: const Icon(Icons.delete_sweep_rounded, size: 18),
                label: const Text('پاک کردن لاگ'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text('آخرین درخواست‌ها (${ApiDebugLog.entries.length})', style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.sm),
          if (ApiDebugLog.entries.isEmpty)
            const Text('هنوز درخواستی ثبت نشده.', style: TextStyle(fontSize: 12))
          else
            ...ApiDebugLog.entries.take(12).map(
                  (e) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                    child: Text(
                      '${e.ok ? '✓' : '✗'} ${e.method} ${e.path}'
                      '${e.statusCode != null ? ' → ${e.statusCode}' : ''}'
                      '${e.durationMs != null ? ' (${e.durationMs}ms)' : ''}'
                      '${e.error != null ? '\n  ${e.error}' : ''}',
                      style: TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: e.ok ? null : Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}
