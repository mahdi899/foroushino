import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _captchaAnswerCtrl = TextEditingController();

  var _step = 0;
  var _loading = false;
  String? _mobileMasked;
  String? _mobile;
  MathChallenge? _captcha;

  @override
  void initState() {
    super.initState();
    _maybeLoadCaptcha();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _otpCtrl.dispose();
    _captchaAnswerCtrl.dispose();
    super.dispose();
  }

  Future<void> _maybeLoadCaptcha() async {
    final state = context.read<AppState>();
    try {
      final protected = await state.isAdminLoginProtected();
      if (!protected || !mounted) return;
      final challenge = await state.fetchMathChallenge();
      if (mounted) setState(() => _captcha = challenge);
    } catch (_) {
      // Captcha is a soft dependency — login must still work if this fails.
    }
  }

  Future<void> _submitCredentials() async {
    if (_emailCtrl.text.trim().isEmpty || _passwordCtrl.text.isEmpty) {
      _show('ایمیل و رمز عبور را کامل وارد کنید.');
      return;
    }

    setState(() => _loading = true);
    try {
      final result = await context.read<AppState>().requestOtp(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            captchaId: _captcha?.id,
            captchaAnswer: _captchaAnswerCtrl.text.isEmpty ? null : _captchaAnswerCtrl.text,
          );
      setState(() {
        _step = 1;
        _mobile = result.mobile;
        _mobileMasked = result.masked;
      });
    } catch (e) {
      _show(messageOf(e));
      await _maybeLoadCaptcha();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final code = _otpCtrl.text.trim();
    if (code.length < 4) {
      _show('کد ارسال‌شده را کامل وارد کنید.');
      return;
    }
    if (_mobile == null) return;

    setState(() => _loading = true);
    try {
      await context.read<AppState>().verifyOtp(mobile: _mobile!, code: code);
    } catch (e) {
      _show(messageOf(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_mobile == null) return;
    setState(() => _loading = true);
    try {
      await context.read<AppState>().resendOtp(_mobile!);
      _show('کد جدید ارسال شد.');
    } catch (e) {
      _show(messageOf(e));
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
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  const Icon(Icons.family_restroom_rounded, size: 64, color: AppColors.primary),
                  const SizedBox(height: 12),
                  Text(
                    AppConfig.appName,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'ورود مخصوص بهرام و ادمین‌های مجاز',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 32),
                  if (_step == 0) ..._buildCredentialsStep() else ..._buildOtpStep(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCredentialsStep() {
    return [
      TextField(
        controller: _emailCtrl,
        keyboardType: TextInputType.emailAddress,
        textDirection: TextDirection.ltr,
        decoration: const InputDecoration(labelText: 'ایمیل ادمین'),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _passwordCtrl,
        obscureText: true,
        textDirection: TextDirection.ltr,
        decoration: const InputDecoration(labelText: 'رمز عبور'),
        onSubmitted: (_) => _submitCredentials(),
      ),
      if (_captcha != null) ...[
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Text(
                'تأیید امنیتی: ${_captcha!.question} = ؟',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 80,
              child: TextField(
                controller: _captchaAnswerCtrl,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                decoration: const InputDecoration(isDense: true),
              ),
            ),
          ],
        ),
      ],
      const SizedBox(height: 20),
      FilledButton(
        onPressed: _loading ? null : _submitCredentials,
        child: _loading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
            : const Text('ورود'),
      ),
    ];
  }

  List<Widget> _buildOtpStep() {
    return [
      Text(
        'کد تأیید به شماره ${_mobileMasked ?? ''} ارسال شد.',
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _otpCtrl,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
        maxLength: 6,
        decoration: const InputDecoration(labelText: 'کد تأیید', counterText: ''),
        onSubmitted: (_) => _verify(),
      ),
      const SizedBox(height: 16),
      FilledButton(
        onPressed: _loading ? null : _verify,
        child: _loading
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
            : const Text('تأیید و ورود'),
      ),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextButton(
            onPressed: _loading
                ? null
                : () => setState(() {
                      _step = 0;
                      _otpCtrl.clear();
                    }),
            child: const Text('بازگشت'),
          ),
          TextButton(
            onPressed: _loading ? null : _resend,
            child: const Text('ارسال دوباره کد'),
          ),
        ],
      ),
    ];
  }
}
