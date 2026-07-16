import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:bahram_family_manager/core/ai/ai_provider_catalog.dart';
import 'package:bahram_family_manager/core/theme/app_theme.dart';
import 'package:bahram_family_manager/core/theme/app_tokens.dart';
import 'package:bahram_family_manager/core/utils/formatters.dart';
import 'package:bahram_family_manager/models/models.dart';
import 'package:bahram_family_manager/state/app_state.dart';
import 'package:bahram_family_manager/widgets/buttons/primary_button.dart';
import 'package:bahram_family_manager/widgets/feedback/app_snackbar.dart';
import 'package:bahram_family_manager/widgets/feedback/async_body.dart';
import 'package:bahram_family_manager/widgets/layout/adaptive_scaffold.dart';
import 'package:bahram_family_manager/widgets/layout/responsive_layout.dart';
import 'package:bahram_family_manager/widgets/navigation/manager_app_bar.dart';
import 'package:bahram_family_manager/widgets/surfaces/panel_gradient_card.dart';

const _customModelToken = '__custom__';

class AiSettingsScreen extends StatefulWidget {
  const AiSettingsScreen({super.key});

  @override
  State<AiSettingsScreen> createState() => _AiSettingsScreenState();
}

class _AiSettingsScreenState extends State<AiSettingsScreen> {
  Future<FamilyBrandingSettings>? _settingsFuture;
  List<AiProviderMeta> _providers = kFallbackAiProviders;
  var _providersLoaded = false;

  @override
  void initState() {
    super.initState();
    _load();
    _loadProviders();
  }

  void _load() {
    setState(() {
      _settingsFuture = context.read<AppState>().manager.getSettings();
    });
  }

  Future<void> _loadProviders() async {
    try {
      final providers = await context.read<AppState>().manager.listAiProviders();
      if (!mounted) return;
      setState(() {
        _providers = providers.isEmpty ? kFallbackAiProviders : providers;
        _providersLoaded = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _providersLoaded = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      appBar: const ManagerAppBar(title: Text('هوش مصنوعی')),
      body: FutureBuilder<FamilyBrandingSettings>(
        future: _settingsFuture,
        builder: (context, snapshot) => AsyncBody<FamilyBrandingSettings>(
          snapshot: snapshot,
          builder: (context, settings) {
            final ai = settings.ai;
            if (ai == null) {
              return const Center(child: Text('تنظیمات AI در دسترس نیست.'));
            }

            if (!_providersLoaded) {
              return const Center(child: CircularProgressIndicator());
            }

            return ListView(
              padding: AppBreakpoints.pagePadding(context),
              children: [
                PanelSectionCard(
                  title: 'ارائه‌دهنده و مدل',
                  icon: Icons.hub_rounded,
                  child: _AiConnectionForm(
                    initial: ai,
                    providers: _providers,
                    onSaved: _load,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                PanelSectionCard(
                  title: 'مدیریت نظرات',
                  icon: Icons.shield_rounded,
                  child: _AiModerationForm(initial: ai, onSaved: _load),
                ),
                const SizedBox(height: AppSpacing.xl),
                PanelSectionCard(
                  title: 'کاربردها',
                  icon: Icons.tips_and_updates_rounded,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _UseCaseRow(
                        icon: Icons.forum_rounded,
                        title: 'تحلیل و تأیید خودکار نظرات',
                        subtitle: 'ریسک، احساس و موضوع هر نظر',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _UseCaseRow(
                        icon: Icons.edit_note_rounded,
                        title: 'پیش‌نویس پست',
                        subtitle: 'کمک AI در ویرایشگر پست',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _UseCaseRow(
                        icon: Icons.insights_rounded,
                        title: 'خلاصه روزانه',
                        subtitle: 'موضوعات پرتکرار در داشبورد',
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _UseCaseRow extends StatelessWidget {
  const _UseCaseRow({required this.icon, required this.title, required this.subtitle});

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(subtitle, style: TextStyle(color: muted, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }
}

class _AiConnectionForm extends StatefulWidget {
  const _AiConnectionForm({
    required this.initial,
    required this.providers,
    required this.onSaved,
  });

  final FamilyAiSettings initial;
  final List<AiProviderMeta> providers;
  final VoidCallback onSaved;

  @override
  State<_AiConnectionForm> createState() => _AiConnectionFormState();
}

class _AiConnectionFormState extends State<_AiConnectionForm> {
  late bool _active;
  late String _providerId;
  late double _temperature;
  late int _maxTokens;
  late bool _hasApiKey;

  final _apiKeyCtrl = TextEditingController();
  late final TextEditingController _baseUrlCtrl;
  late final TextEditingController _modelCtrl;
  late final TextEditingController _maxTokensCtrl;

  String? _selectedModel;
  var _useCustomModel = false;
  var _saving = false;
  var _testing = false;
  String? _testMessage;
  bool? _testSuccess;

  AiProviderMeta get _providerMeta =>
      findAiProvider(widget.providers, _providerId) ?? widget.providers.first;

  @override
  void initState() {
    super.initState();
    _apply(widget.initial);
    _baseUrlCtrl = TextEditingController(text: widget.initial.baseUrl);
    _modelCtrl = TextEditingController(text: widget.initial.model);
    _maxTokensCtrl = TextEditingController(text: _maxTokens.toString());
    _syncModelSelection();
  }

  @override
  void didUpdateWidget(covariant _AiConnectionForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initial != widget.initial) {
      _apply(widget.initial);
      _baseUrlCtrl.text = widget.initial.baseUrl;
      _modelCtrl.text = widget.initial.model;
      _maxTokensCtrl.text = _maxTokens.toString();
      _syncModelSelection();
    }
  }

  void _apply(FamilyAiSettings s) {
    _active = s.isActive;
    _providerId = s.providerName;
    _temperature = s.temperature;
    _maxTokens = s.maxTokens;
    _hasApiKey = s.hasApiKey;
  }

  void _syncModelSelection() {
    final models = _providerMeta.models;
    if (_providerId == 'custom' || models.isEmpty) {
      _useCustomModel = true;
      _selectedModel = _customModelToken;
      return;
    }
    if (models.contains(widget.initial.model)) {
      _useCustomModel = false;
      _selectedModel = widget.initial.model;
    } else if (widget.initial.model.isNotEmpty) {
      _useCustomModel = true;
      _selectedModel = _customModelToken;
    } else {
      _useCustomModel = false;
      _selectedModel = models.first;
      _modelCtrl.text = models.first;
    }
  }

  void _onProviderChanged(String? providerId) {
    if (providerId == null || providerId == _providerId) return;
    final meta = findAiProvider(widget.providers, providerId);
    if (meta == null) return;

    setState(() {
      _providerId = providerId;
      _baseUrlCtrl.text = meta.defaultBaseUrl;
      if (meta.models.isNotEmpty) {
        _useCustomModel = false;
        _selectedModel = meta.models.first;
        _modelCtrl.text = meta.models.first;
      } else {
        _useCustomModel = true;
        _selectedModel = _customModelToken;
        _modelCtrl.clear();
      }
      _testMessage = null;
      _testSuccess = null;
    });
  }

  void _onModelChanged(String? model) {
    if (model == null) return;
    setState(() {
      _selectedModel = model;
      _useCustomModel = model == _customModelToken;
      if (!_useCustomModel) {
        _modelCtrl.text = model;
      }
    });
  }

  String get _resolvedModel {
    if (_useCustomModel || _selectedModel == _customModelToken) {
      return _modelCtrl.text.trim();
    }
    return _selectedModel ?? _modelCtrl.text.trim();
  }

  FamilyAiSettings _buildSettings() => FamilyAiSettings(
        isActive: _active,
        providerName: _providerId,
        baseUrl: _baseUrlCtrl.text.trim(),
        model: _resolvedModel.isEmpty ? widget.initial.model : _resolvedModel,
        temperature: _temperature,
        maxTokens: int.tryParse(_maxTokensCtrl.text) ?? _maxTokens,
        hasApiKey: _hasApiKey,
        autoApproveComments: widget.initial.autoApproveComments,
        autoRejectHighRisk: widget.initial.autoRejectHighRisk,
        riskApproveThreshold: widget.initial.riskApproveThreshold,
        riskRejectThreshold: widget.initial.riskRejectThreshold,
        defaultActionDays: widget.initial.defaultActionDays,
      );

  @override
  void dispose() {
    _apiKeyCtrl.dispose();
    _baseUrlCtrl.dispose();
    _modelCtrl.dispose();
    _maxTokensCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_resolvedModel.isEmpty) {
      showAppSnackBar(context, 'نام مدل را وارد کنید.');
      return;
    }
    if (_providerId == 'custom' && _baseUrlCtrl.text.trim().isEmpty) {
      showAppSnackBar(context, 'آدرس API سرویس سفارشی الزامی است.');
      return;
    }

    setState(() => _saving = true);
    try {
      final updated = await context.read<AppState>().manager.updateAiSettings(
            _buildSettings().toUpdatePayload(
              apiKey: _apiKeyCtrl.text.trim().isEmpty ? null : _apiKeyCtrl.text.trim(),
            ),
          );
      _apiKeyCtrl.clear();
      setState(() {
        _hasApiKey = updated.hasApiKey;
        _testMessage = null;
        _testSuccess = null;
      });
      widget.onSaved();
      if (mounted) showAppSnackBar(context, 'تنظیمات AI ذخیره شد.');
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _test() async {
    setState(() {
      _testing = true;
      _testMessage = null;
      _testSuccess = null;
    });
    try {
      final draft = _buildSettings().toUpdatePayload(
        apiKey: _apiKeyCtrl.text.trim().isEmpty ? null : _apiKeyCtrl.text.trim(),
      );
      final result = await context.read<AppState>().manager.testAiConnection(draft: draft);
      if (!mounted) return;
      setState(() {
        _testSuccess = result.success;
        _testMessage = result.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _testSuccess = false;
        _testMessage = messageOf(e);
      });
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  Future<void> _clearApiKey() async {
    setState(() => _saving = true);
    try {
      final updated = await context.read<AppState>().manager.updateAiSettings(
            _buildSettings().toUpdatePayload(clearApiKey: true),
          );
      setState(() => _hasApiKey = updated.hasApiKey);
      widget.onSaved();
      if (mounted) showAppSnackBar(context, 'کلید API حذف شد.');
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);
    final meta = _providerMeta;
    final modelOptions = [
      ...meta.models,
      if (meta.models.isNotEmpty) _customModelToken,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('فعال‌سازی AI'),
          subtitle: const Text('تحلیل نظرات، پیش‌نویس پست و خلاصه روزانه'),
          value: _active,
          onChanged: _saving ? null : (v) => setState(() => _active = v),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text('ارائه‌دهنده', style: TextStyle(color: muted, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: widget.providers.map((provider) {
            final selected = provider.id == _providerId;
            return ChoiceChip(
              label: Text(provider.label),
              selected: selected,
              onSelected: _saving ? null : (_) => _onProviderChanged(provider.id),
            );
          }).toList(),
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.primarySoft.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
          ),
          child: Text(meta.hint, style: TextStyle(color: muted, fontSize: 12, height: 1.5)),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          _hasApiKey ? 'کلید API ثبت شده است' : 'کلید API تنظیم نشده',
          style: TextStyle(color: muted, fontSize: 12),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextField(
          controller: _baseUrlCtrl,
          decoration: InputDecoration(
            labelText: 'آدرس API',
            hintText: meta.defaultBaseUrl.isEmpty ? 'https://...' : meta.defaultBaseUrl,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        if (modelOptions.isNotEmpty)
          DropdownButtonFormField<String>(
            value: _selectedModel ?? modelOptions.first,
            decoration: const InputDecoration(labelText: 'مدل'),
            items: [
              ...meta.models.map((m) => DropdownMenuItem(value: m, child: Text(m))),
              if (meta.models.isNotEmpty)
                const DropdownMenuItem(value: _customModelToken, child: Text('مدل دیگر (دستی)')),
            ],
            onChanged: _saving ? null : _onModelChanged,
          ),
        if (_useCustomModel || meta.models.isEmpty) ...[
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _modelCtrl,
            decoration: InputDecoration(
              labelText: meta.id == 'custom' ? 'نام مدل' : 'نام مدل (دستی)',
              hintText: meta.id == 'custom' ? 'مثلاً openrouter/anthropic/claude-3.5-sonnet' : meta.defaultModel,
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.sm),
        Text('دما: ${toFaDigits(_temperature.toStringAsFixed(2))}', style: TextStyle(color: muted, fontSize: 13)),
        Slider(
          value: _temperature,
          min: 0,
          max: 1.5,
          divisions: 15,
          label: _temperature.toStringAsFixed(2),
          onChanged: _saving ? null : (v) => setState(() => _temperature = v),
        ),
        TextField(
          controller: _maxTokensCtrl,
          decoration: const InputDecoration(labelText: 'حداکثر توکن'),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: AppSpacing.sm),
        TextField(
          controller: _apiKeyCtrl,
          decoration: InputDecoration(
            labelText: 'کلید API جدید (اختیاری)',
            hintText: meta.keyHint,
          ),
          obscureText: true,
        ),
        if (_hasApiKey) ...[
          const SizedBox(height: AppSpacing.sm),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton(
              onPressed: _saving ? null : _clearApiKey,
              child: const Text('حذف کلید API', style: TextStyle(color: AppColors.error)),
            ),
          ),
        ],
        if (_testMessage != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            _testMessage!,
            style: TextStyle(
              color: _testSuccess == true ? AppColors.success : AppColors.error,
              fontSize: 13,
              height: 1.5,
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _testing || _saving ? null : _test,
                child: _testing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('تست اتصال'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: PrimaryButton(label: 'ذخیره', loading: _saving, onPressed: _save),
            ),
          ],
        ),
      ],
    );
  }
}

class _AiModerationForm extends StatefulWidget {
  const _AiModerationForm({required this.initial, required this.onSaved});

  final FamilyAiSettings initial;
  final VoidCallback onSaved;

  @override
  State<_AiModerationForm> createState() => _AiModerationFormState();
}

class _AiModerationFormState extends State<_AiModerationForm> {
  late bool _autoApprove;
  late bool _autoReject;
  late double _approveThreshold;
  late double _rejectThreshold;
  late final TextEditingController _daysCtrl;
  var _saving = false;

  @override
  void initState() {
    super.initState();
    _apply(widget.initial);
    _daysCtrl = TextEditingController(text: widget.initial.defaultActionDays.toString());
  }

  @override
  void didUpdateWidget(covariant _AiModerationForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initial != widget.initial) {
      _apply(widget.initial);
      _daysCtrl.text = widget.initial.defaultActionDays.toString();
    }
  }

  void _apply(FamilyAiSettings s) {
    _autoApprove = s.autoApproveComments;
    _autoReject = s.autoRejectHighRisk;
    _approveThreshold = s.riskApproveThreshold;
    _rejectThreshold = s.riskRejectThreshold;
  }

  @override
  void dispose() {
    _daysCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await context.read<AppState>().manager.updateAiSettings(
            FamilyAiSettings(
              isActive: widget.initial.isActive,
              providerName: widget.initial.providerName,
              baseUrl: widget.initial.baseUrl,
              model: widget.initial.model,
              temperature: widget.initial.temperature,
              maxTokens: widget.initial.maxTokens,
              hasApiKey: widget.initial.hasApiKey,
              autoApproveComments: _autoApprove,
              autoRejectHighRisk: _autoReject,
              riskApproveThreshold: _approveThreshold,
              riskRejectThreshold: _rejectThreshold,
              defaultActionDays: int.tryParse(_daysCtrl.text) ?? widget.initial.defaultActionDays,
            ).toUpdatePayload(),
          );
      widget.onSaved();
      if (mounted) showAppSnackBar(context, 'تنظیمات نظارت AI ذخیره شد.');
    } catch (e) {
      if (mounted) showAppSnackBar(context, messageOf(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.65);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('تأیید خودکار نظرات امن'),
          subtitle: const Text('نظرات کم‌ریسک خودکار تأیید می‌شوند'),
          value: _autoApprove,
          onChanged: _saving ? null : (v) => setState(() => _autoApprove = v),
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('رد خودکار نظرات پرریسک'),
          value: _autoReject,
          onChanged: _saving ? null : (v) => setState(() => _autoReject = v),
        ),
        Text('آستانه تأیید: ${toFaDigits((_approveThreshold * 100).round().toString())}٪', style: TextStyle(color: muted, fontSize: 13)),
        Slider(
          value: _approveThreshold,
          min: 0.05,
          max: 0.8,
          divisions: 15,
          onChanged: _saving ? null : (v) => setState(() => _approveThreshold = v),
        ),
        Text('آستانه رد: ${toFaDigits((_rejectThreshold * 100).round().toString())}٪', style: TextStyle(color: muted, fontSize: 13)),
        Slider(
          value: _rejectThreshold,
          min: 0.2,
          max: 1,
          divisions: 16,
          onChanged: _saving ? null : (v) => setState(() => _rejectThreshold = v),
        ),
        TextField(
          controller: _daysCtrl,
          decoration: const InputDecoration(labelText: 'مدت پیش‌فرض نظرسنجی/تعهد (روز)'),
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: AppSpacing.md),
        PrimaryButton(label: 'ذخیره تنظیمات نظارت', loading: _saving, onPressed: _save),
      ],
    );
  }
}
