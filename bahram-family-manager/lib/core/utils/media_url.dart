import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/models/models.dart';

/// Resolves media URLs from API (`cdn_url`, `url`) to absolute network URLs.
String? resolveMediaUrl(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  final apiBase = AppConfig.apiBaseUrl;
  final origin = apiBase.replaceFirst(RegExp(r'/api/v1/?$'), '');
  final path = raw.startsWith('/') ? raw : '/$raw';
  return '$origin$path';
}

extension FamilyMediaRefUrl on FamilyMediaRef {
  String? get playableUrl => resolveMediaUrl(cdnUrl);

  bool get isImage => type == 'image';
  bool get isVideo => type == 'video';
  bool get isAudio => type == 'voice' || type == 'audio';
}
