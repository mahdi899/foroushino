import 'package:flutter/material.dart';

import 'package:bahram_family_manager/core/theme/app_theme.dart';

/// Circular Bahram brand mark — shared across login, empty states, and headers.
class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.size = 80,
    this.showShadow = true,
  });

  final double size;
  final bool showShadow;

  static const _asset = 'assets/branding/logo-bahram.webp';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.22),
                  blurRadius: size * 0.18,
                  offset: Offset(0, size * 0.06),
                ),
              ]
            : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.asset(
        _asset,
        fit: BoxFit.cover,
        semanticLabel: 'لوگوی بهرام رستمی',
      ),
    );
  }
}
