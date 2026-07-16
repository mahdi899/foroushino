import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

const mediaPostTypes = ['text', 'voice', 'video', 'image'];
const choiceActionTypes = ['single_choice', 'multi_choice'];

class PostTypeSelector extends StatelessWidget {
  const PostTypeSelector({
    super.key,
    required this.selected,
    required this.onChanged,
    this.enabled = true,
  });

  final String selected;
  final ValueChanged<String> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: AppSpacing.md,
      crossAxisSpacing: AppSpacing.md,
      childAspectRatio: 1.55,
      children: mediaPostTypes.map((type) {
        final active = selected == type;
        return _TypeTile(
          label: labelOf(postTypeLabels, type),
          icon: _iconFor(type),
          active: active,
          enabled: enabled,
          onTap: () => onChanged(type),
        );
      }).toList(),
    );
  }

  IconData _iconFor(String type) => switch (type) {
        'text' => Icons.article_rounded,
        'voice' => Icons.mic_rounded,
        'video' => Icons.videocam_rounded,
        'image' => Icons.image_rounded,
        _ => Icons.campaign_rounded,
      };
}

class _TypeTile extends StatelessWidget {
  const _TypeTile({
    required this.label,
    required this.icon,
    required this.active,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: active
          ? InkWell(
              onTap: enabled ? onTap : null,
              borderRadius: BorderRadius.circular(18),
              child: Ink(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  gradient: AppGradients.primary,
                  boxShadow: AppShadows.panelGlow,
                ),
                child: _tileContent(active),
              ),
            )
          : GlassPanel(
              borderRadius: 18,
              blur: 16,
              onTap: enabled ? onTap : null,
              child: _tileContent(active),
            ),
    );
  }

  Widget _tileContent(bool active) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 30, color: active ? Colors.white : AppColors.primary),
        const SizedBox(height: AppSpacing.sm),
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : AppColors.text,
          ),
        ),
      ],
    );
  }
}
