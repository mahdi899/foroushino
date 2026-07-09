import 'package:flutter/material.dart';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏸ اپ اندروید سات — فعلاً متوقف
// برای ادامه توسعه، بلوک PAUSED را کامنت کنید و بلوک ACTIVE را باز کنید.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// --- PAUSED (فعال) ---
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const _PausedApp());
}

class _PausedApp extends StatelessWidget {
  const _PausedApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'اپ اندروید سات\nفعلاً در حال توسعه نیست',
              textAlign: TextAlign.center,
              textDirection: TextDirection.rtl,
              style: TextStyle(fontSize: 18),
            ),
          ),
        ),
      ),
    );
  }
}

// --- ACTIVE (بعداً فعال کنید) ---
// import 'package:saat_mobile/app.dart';
//
// void main() {
//   WidgetsFlutterBinding.ensureInitialized();
//   runApp(const SaatApp());
// }
