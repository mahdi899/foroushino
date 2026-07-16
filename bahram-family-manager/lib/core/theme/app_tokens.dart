import 'package:flutter/material.dart';

/// Design tokens aligned with bahram-cm admin/panel (Saat Teal, light theme).
class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
}

class AppLayout {
  AppLayout._();

  static const double sidebarWidth = 280;
  static const double shellPadding = 10;
  static const double contentPanelRadius = 14;
}

class AppGlass {
  AppGlass._();

  static const double panelBlur = 22;
  static const double sheetBlur = 26;
  static const double navBlur = 24;

  static double panelOpacity(Brightness brightness) => brightness == Brightness.dark ? 0.58 : 0.74;
  static double inputOpacity(Brightness brightness) => brightness == Brightness.dark ? 0.42 : 0.62;
}

class AppRadius {
  AppRadius._();

  static const double tile = 12;
  static const double card = 16;
  static const double sheet = 20;
  static const double pill = 999;

  static BorderRadius get tileBorder => BorderRadius.circular(tile);
  static BorderRadius get cardBorder => BorderRadius.circular(card);
  static BorderRadius get sheetBorder => const BorderRadius.vertical(top: Radius.circular(sheet));
}

class AppMotion {
  AppMotion._();

  static const Curve luxe = Cubic(0.16, 1, 0.3, 1);
  static const Duration fast = Duration(milliseconds: 200);
  static const Duration normal = Duration(milliseconds: 300);
}

class AppShadows {
  AppShadows._();

  static List<BoxShadow> get soft => [
        BoxShadow(
          color: const Color(0xFF003B40).withValues(alpha: 0.05),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get primaryGlow => [
        BoxShadow(
          color: const Color(0xFF008C96).withValues(alpha: 0.2),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get panelGlow => [
        BoxShadow(
          color: const Color(0xFF008C96).withValues(alpha: 0.14),
          blurRadius: 28,
          offset: const Offset(0, 10),
        ),
      ];
}

class AppGradients {
  AppGradients._();

  static const primary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF008C96), Color(0xFF25A0A6)],
  );

  static LinearGradient iconShell({bool active = false}) {
    if (active) return primary;
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        const Color(0xFF25A0A6).withValues(alpha: 0.1),
        const Color(0xFF008C96).withValues(alpha: 0.06),
      ],
    );
  }
}
