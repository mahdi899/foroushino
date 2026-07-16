import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/features/auth/login_screen.dart';
import 'package:bahram_family_manager/features/shell/root_shell.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class FamilyManagerApp extends StatelessWidget {
  const FamilyManagerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..bootstrap(),
      child: Consumer<AppState>(
        builder: (context, state, _) => MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: state.themeMode,
        locale: const Locale('fa', 'IR'),
        supportedLocales: const [Locale('fa', 'IR')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          return Directionality(
            textDirection: TextDirection.rtl,
            child: SizedBox.expand(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: isDark
                        ? const [Color(0xFF0D1517), Color(0xFF111C1F), Color(0xFF0D1517)]
                        : const [Color(0xFFF4F8F8), Color(0xFFEEF6F6), Color(0xFFF8FBFB)],
                  ),
                ),
                child: child ?? const SizedBox.shrink(),
              ),
            ),
          );
        },
        home: const _RootGate(),
        ),
      ),
    );
  }
}

class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    if (state.bootstrapping) {
      return const Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (state.sessionError != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final messenger = ScaffoldMessenger.maybeOf(context);
        messenger?.showSnackBar(SnackBar(content: Text(state.sessionError!)));
        state.clearSessionError();
      });
    }

    if (state.user == null) {
      return const LoginScreen();
    }

    return const RootShell();
  }
}
