// ⏸ فعلاً از main.dart اجرا نمی‌شود — هنگام ادامه توسعه، main.dart را به حالت ACTIVE برگردانید.

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/features/auth/login_screen.dart';
import 'package:saat_mobile/features/home/home_screen.dart';
import 'package:saat_mobile/state/app_state.dart';

class SaatApp extends StatelessWidget {
  const SaatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..bootstrap(),
      child: MaterialApp(
        title: 'سات',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        locale: const Locale('fa', 'IR'),
        supportedLocales: const [Locale('fa', 'IR')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: (context, child) {
          return Directionality(
            textDirection: TextDirection.rtl,
            child: child ?? const SizedBox.shrink(),
          );
        },
        home: const _RootGate(),
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
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (state.user == null) {
      return const LoginScreen();
    }

    return const HomeScreen();
  }
}
