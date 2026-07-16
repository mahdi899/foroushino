import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/labels.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';

const mediaPostTypes = ['text', 'voice', 'video', 'image'];
const choiceActionTypes = ['single_choice', 'multi_choice'];

/// Telegram-style horizontal attach bar for post type selection.
class PostTypeSelector extends StatelessWidget {
  const PostTypeSelector({
    super.key,
    required this.selected,
    required this.onChanged,
    this.enabled = true,
    this.onAttachMedia,
  });

  final String selected;
  final ValueChanged<String> onChanged;
  final bool enabled;
  final VoidCallback? onAttachMedia;

  @override
  Widget build(BuildContext context) {
    final scheme = context.appScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: context.appSurfaceSoft.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.appBorder.withValues(alpha: 0.85)),
      ),
      child: Row(
        children: [
          Icon(Icons.attach_file_rounded, size: 20, color: scheme.onSurface.withValues(alpha: 0.55)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: mediaPostTypes.map((type) {
                  final active = selected == type;
                  return Padding(
                    padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                    child: _AttachChip(
                      label: labelOf(postTypeLabels, type),
                      icon: _iconFor(type),
                      active: active,
                      enabled: enabled,
                      onTap: () {
                        onChanged(type);
                        if (type != 'text') onAttachMedia?.call();
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconFor(String type) => switch (type) {
        'text' => Icons.chat_bubble_outline_rounded,
        'voice' => Icons.mic_none_rounded,
        'video' => Icons.videocam_outlined,
        'image' => Icons.photo_outlined,
        _ => Icons.campaign_outlined,
      };
}

class _AttachChip extends StatelessWidget {
  const _AttachChip({
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
    final scheme = context.appScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: active ? AppGradients.primary : null,
            color: active ? null : scheme.surface.withValues(alpha: enabled ? 0.55 : 0.28),
            border: Border.all(
              color: active ? Colors.transparent : context.appBorder.withValues(alpha: 0.8),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: active ? Colors.white : scheme.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : scheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
