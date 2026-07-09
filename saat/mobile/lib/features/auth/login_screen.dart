import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:saat_mobile/config/app_config.dart';
import 'package:saat_mobile/core/api/api_exception.dart';
import 'package:saat_mobile/core/theme/app_theme.dart';
import 'package:saat_mobile/core/utils/phone.dart';
import 'package:saat_mobile/state/app_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  var _step = 0;
  var _loading = false;
  String? _hint;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final phone = normalizeIranPhone(_phoneCtrl.text);
    if (!isValidIranMobile(phone)) {
      _show('شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)');
      return;
    }

    setState(() => _loading = true);
    try {
      final hint = await context.read<AppState>().requestOtp(phone);
      setState(() {
        _step = 1;
        _hint = hint.isNotEmpty ? hint : null;
        _phoneCtrl.text = phone;
      });
    } on ApiException catch (e) {
      _show(e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final phone = _phoneCtrl.text;
    final code = digitsOnly(_otpCtrl.text);
    if (code.length != 5) {
      _show('کد ۵ رقمی را کامل وارد کنید');
      return;
    }

    setState(() => _loading = true);
    try {
      await context.read<AppState>().login(phone, code);
    } on ApiException catch (e) {
      _show(e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _show(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Icon(Icons.phone_in_talk_rounded, size: 72, color: AppColors.primary),
              const SizedBox(height: 16),
              Text(
                AppConfig.appName,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.text,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                AppConfig.tagline,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 40),
              if (_step == 0) ...[
                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  textDirection: TextDirection.ltr,
                  decoration: const InputDecoration(
                    labelText: 'شماره موبایل',
                    hintText: '09121234567',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loading ? null : _requestOtp,
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('دریافت کد ورود'),
                ),
              ] else ...[
                Text(
                  'کد ارسال‌شده به ${formatPhoneFa(_phoneCtrl.text)}',
                  textAlign: TextAlign.center,
                ),
                if (_hint != null) ...[
                  const SizedBox(height: 8),
                  Text(_hint!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
                ],
                const SizedBox(height: 16),
                TextField(
                  controller: _otpCtrl,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 5,
                  decoration: const InputDecoration(
                    labelText: 'کد ۵ رقمی',
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loading ? null : _verify,
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('ورود'),
                ),
                TextButton(
                  onPressed: _loading ? null : () => setState(() => _step = 0),
                  child: const Text('تغییر شماره'),
                ),
              ],
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
