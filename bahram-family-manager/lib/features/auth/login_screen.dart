import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/widgets/branding/app_logo.dart';
import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/app_card.dart';
import 'package:bahram_family_manager/widgets/surfaces/glass_surface.dart';

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
    } catch (_) {}
  }

  Future<void> _submitCredentials() async {
    if (_loading) return;
    if (_emailCtrl.text.trim().isEmpty || _passwordCtrl.text.isEmpty) {
      showAppSnackBar(context, 'ایمیل و رمز عبور را کامل وارد کنید.');
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
      if (!mounted) return;
      setState(() {
        _step = 1;
        _mobile = result.mobile;
        _mobileMasked = result.masked;
      });
    } catch (e) {
      if (!mounted) return;
      showAppSnackBar(context, messageOf(e));
      await _maybeLoadCaptcha();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    if (_loading) return;
    final code = _otpCtrl.text.trim();
    if (code.length < 4) {
      showAppSnackBar(context, 'کد ارسال‌شده را کامل وارد کنید.');
      return;
    }
    if (_mobile == null) return;

    setState(() => _loading = true);
    try {
      await context.read<AppState>().verifyOtp(mobile: _mobile!, code: code);
    } catch (e) {
      if (!mounted) return;
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_loading) return;
    if (_mobile == null) return;
    setState(() => _loading = true);
    try {
      await context.read<AppState>().resendOtp(_mobile!);
      if (!mounted) return;
      showAppSnackBar(context, 'کد جدید ارسال شد.');
    } catch (e) {
      if (!mounted) return;
      showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = AppBreakpoints.isDesktop(context);
    final scheme = Theme.of(context).colorScheme;
    final muted = scheme.onSurface.withValues(alpha: 0.65);

    if (isDesktop) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: const ManagerAppBar(
          title: SizedBox.shrink(),
          showThemeToggle: true,
          themeToggleCompact: false,
        ),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 960, maxHeight: 620),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xxl),
              child: GlassPanel(
                borderRadius: 20,
                blur: 28,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Row(
                    children: [
                      Expanded(child: _BrandingPanel()),
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(AppSpacing.xxxl),
                          child: _LoginForm(
                            step: _step,
                            loading: _loading,
                            mobileMasked: _mobileMasked,
                            captcha: _captcha,
                            emailCtrl: _emailCtrl,
                            passwordCtrl: _passwordCtrl,
                            otpCtrl: _otpCtrl,
                            captchaAnswerCtrl: _captchaAnswerCtrl,
                            onSubmitCredentials: _submitCredentials,
                            onVerify: _verify,
                            onResend: _resend,
                            onBack: () => setState(() {
                              _step = 0;
                              _otpCtrl.clear();
                            }),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: const ManagerAppBar(
        title: SizedBox.shrink(),
        showThemeToggle: true,
        themeToggleCompact: false,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppSpacing.xxl),
                  const AppLogo(size: 88),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    AppConfig.appName,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'ورود مخصوص بهرام و ادمین‌های مجاز',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: muted),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  AppCard(
                    child: _LoginForm(
                      step: _step,
                      loading: _loading,
                      mobileMasked: _mobileMasked,
                      captcha: _captcha,
                      emailCtrl: _emailCtrl,
                      passwordCtrl: _passwordCtrl,
                      otpCtrl: _otpCtrl,
                      captchaAnswerCtrl: _captchaAnswerCtrl,
                      onSubmitCredentials: _submitCredentials,
                      onVerify: _verify,
                      onResend: _resend,
                      onBack: () => setState(() {
                        _step = 0;
                        _otpCtrl.clear();
                      }),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BrandingPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [Color(0xFF004A52), Color(0xFF007F88), Color(0xFF0099A3)],
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxxl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const AppLogo(size: 72, showShadow: false),
            const SizedBox(height: AppSpacing.xl),
            Text(
              AppConfig.appName,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'مدیریت خانواده، پست‌ها، نظرات و برندینگ — همه در یک پنل حرفه‌ای.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.88), height: 1.7, fontSize: 14),
            ),
            const SizedBox(height: AppSpacing.xxl),
            _FeatureRow(icon: Icons.groups_rounded, label: 'مدیریت خانواده‌ها'),
            const SizedBox(height: AppSpacing.md),
            _FeatureRow(icon: Icons.forum_rounded, label: 'بررسی و پاسخ به نظرات'),
            const SizedBox(height: AppSpacing.md),
            _FeatureRow(icon: Icons.insights_rounded, label: 'تحلیل و گزارش روزانه'),
          ],
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: Colors.white, size: 18),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.95), fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}

class _LoginForm extends StatelessWidget {
  const _LoginForm({
    required this.step,
    required this.loading,
    required this.mobileMasked,
    required this.captcha,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.otpCtrl,
    required this.captchaAnswerCtrl,
    required this.onSubmitCredentials,
    required this.onVerify,
    required this.onResend,
    required this.onBack,
  });

  final int step;
  final bool loading;
  final String? mobileMasked;
  final MathChallenge? captcha;
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final TextEditingController otpCtrl;
  final TextEditingController captchaAnswerCtrl;
  final VoidCallback onSubmitCredentials;
  final VoidCallback onVerify;
  final VoidCallback onResend;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: step == 0 ? _credentialsStep(context) : _otpStep(context),
    );
  }

  List<Widget> _credentialsStep(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);
    return [
      Text('ورود به پنل', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: AppSpacing.xs),
      Text('ایمیل و رمز عبور ادمین را وارد کنید.', style: TextStyle(color: muted)),
      const SizedBox(height: AppSpacing.xl),
      TextField(
        controller: emailCtrl,
        keyboardType: TextInputType.emailAddress,
        textDirection: TextDirection.ltr,
        decoration: const InputDecoration(labelText: 'ایمیل ادمین'),
      ),
      const SizedBox(height: AppSpacing.md),
      TextField(
        controller: passwordCtrl,
        obscureText: true,
        textDirection: TextDirection.ltr,
        decoration: const InputDecoration(labelText: 'رمز عبور'),
        onSubmitted: (_) => onSubmitCredentials(),
      ),
      if (captcha != null) ...[
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: Text(
                'تأیید امنیتی: ${captcha!.question} = ؟',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            SizedBox(
              width: 80,
              child: TextField(
                controller: captchaAnswerCtrl,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                decoration: const InputDecoration(isDense: true),
              ),
            ),
          ],
        ),
      ],
      const SizedBox(height: AppSpacing.xl),
      PrimaryButton(label: 'ورود', loading: loading, onPressed: onSubmitCredentials),
    ];
  }

  List<Widget> _otpStep(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);
    return [
      Text('تأیید دو مرحله‌ای', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: AppSpacing.sm),
      Text(
        'کد تأیید به شماره ${mobileMasked ?? ''} ارسال شد.',
        style: TextStyle(color: muted),
      ),
      const SizedBox(height: AppSpacing.xl),
      TextField(
        controller: otpCtrl,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        textDirection: TextDirection.ltr,
        maxLength: 6,
        decoration: const InputDecoration(labelText: 'کد تأیید', counterText: ''),
        onSubmitted: (_) => onVerify(),
      ),
      const SizedBox(height: AppSpacing.lg),
      PrimaryButton(label: 'تأیید و ورود', loading: loading, onPressed: onVerify),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextButton(onPressed: loading ? null : onBack, child: const Text('بازگشت')),
          TextButton(onPressed: loading ? null : onResend, child: const Text('ارسال دوباره کد')),
        ],
      ),
    ];
  }
}
