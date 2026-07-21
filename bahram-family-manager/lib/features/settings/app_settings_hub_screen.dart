import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/features/ai/ai_settings_screen.dart';
import 'package:bahram_family_manager/features/analytics/analytics_screen.dart';
import 'package:bahram_family_manager/features/settings/settings_screen.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

class _HubItem {
  const _HubItem({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.builder,
    this.permission,
  });

  final String label;
  final String subtitle;
  final IconData icon;
  final Color color;
  final WidgetBuilder builder;
  final String? permission;
}

/// Mobile hub for secondary destinations (analytics, AI, branding) + appearance.
class AppSettingsHubScreen extends StatelessWidget {
  const AppSettingsHubScreen({super.key});

  static final _items = <_HubItem>[
    _HubItem(
      label: 'تحلیل',
      subtitle: 'آمار عضویت، پست‌ها و منابع ورودی',
      icon: Icons.insights_rounded,
      color: AppColors.primary,
      builder: (_) => const AnalyticsScreen(),
      permission: 'family.analytics.view',
    ),
    _HubItem(
      label: 'هوش مصنوعی',
      subtitle: 'ارائه‌دهنده، مدل و مدیریت نظرات',
      icon: Icons.auto_awesome_rounded,
      color: AppColors.accent,
      builder: (_) => const AiSettingsScreen(),
      permission: 'family.settings.manage',
    ),
    _HubItem(
      label: 'برندینگ',
      subtitle: 'نام و آواتار پروفایل خانواده',
      icon: Icons.palette_rounded,
      color: AppColors.gold,
      builder: (_) => const SettingsScreen(),
      permission: 'family.settings.manage',
    ),
  ];

  bool _canAccess(_HubItem item, AppState state) {
    final user = state.user;
    if (item.permission == null) return true;
    return user?.can(item.permission!) ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final visible = _items.where((i) => _canAccess(i, state)).toList();
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.6);

    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('تنظیمات')),
      body: ListView(
        padding: AppBreakpoints.pagePadding(context),
        children: [
          Text(
            'ظاهر',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: AppSpacing.sm),
          const _ThemeModeCard(),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'بخش‌های بیشتر',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'تحلیل، هوش مصنوعی و برندینگ را از اینجا باز کنید.',
            style: TextStyle(color: muted, fontSize: 13),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (visible.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xxl),
              child: Text(
                'دسترسی به بخش‌های بیشتر ندارید.',
                textAlign: TextAlign.center,
                style: TextStyle(color: muted),
              ),
            )
          else
            for (final item in visible) ...[
              _HubTile(
                item: item,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: item.builder),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
        ],
      ),
    );
  }
}

class _ThemeModeCard extends StatelessWidget {
  const _ThemeModeCard();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final scheme = Theme.of(context).colorScheme;
    final isDark = switch (state.themeMode) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system => MediaQuery.platformBrightnessOf(context) == Brightness.dark,
    };
    final accent = isDark ? AppColors.gold : AppColors.primary;

    return GlassPanel(
      borderRadius: 18,
      blur: 0,
      padding: const EdgeInsets.all(AppSpacing.md),
      onTap: () => state.toggleTheme(),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: accent.withValues(alpha: 0.45)),
            ),
            child: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              color: accent,
              size: 24,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isDark ? 'حالت تاریک فعال است' : 'حالت روشن فعال است',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  isDark ? 'برای روشن کردن ضربه بزنید' : 'برای تاریک کردن ضربه بزنید',
                  style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.6), fontSize: 12),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: isDark,
            activeColor: accent,
            onChanged: (_) => state.toggleTheme(),
          ),
        ],
      ),
    );
  }
}

class _HubTile extends StatelessWidget {
  const _HubTile({required this.item, required this.onTap});

  final _HubItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.6);

    return GlassPanel(
      borderRadius: 18,
      blur: 0,
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [item.color.withValues(alpha: 0.85), item.color],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: AppShadows.primaryGlow,
              ),
              child: Icon(item.icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.label,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.subtitle,
                    style: TextStyle(color: muted, fontSize: 12, height: 1.35),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_left_rounded, color: muted),
          ],
        ),
      ),
    );
  }
}
