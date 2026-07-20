import 'package:flutter/foundation.dart';

import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/config/dev_ports.dart';
import 'package:bahram_family_manager/models/models.dart';

/// Resolves media URLs from API (`cdn_url`, `url`) to absolute network URLs.
String? resolveMediaUrl(String? raw) {
  if (raw == null || raw.isEmpty) return null;

  final parsed = Uri.tryParse(raw);
  if (parsed != null && parsed.hasScheme) {
    return _rewriteForWeb(parsed).toString();
  }

  final path = raw.startsWith('/') ? raw : '/$raw';

  if (kIsWeb && path.startsWith('/storage/')) {
    return '${DevPorts.appUrl}$path';
  }

  final apiBase = AppConfig.apiBaseUrl;
  final origin = apiBase.replaceFirst(RegExp(r'/api/v1/?$'), '');
  return '$origin$path';
}

Uri _rewriteForWeb(Uri uri) {
  if (!kIsWeb) return uri;

  // Admin on rostami.club: load family CDN assets same-origin (external CDN has no CORS).
  if (uri.host == 'cdn.rostami.app' && uri.path.startsWith('/media/family/')) {
    final page = Uri.base;
    if (page.host.endsWith('rostami.club')) {
      return Uri(
        scheme: page.scheme,
        host: page.host,
        path: uri.path,
        query: uri.query.isEmpty ? null : uri.query,
      );
    }
  }

  if (!uri.path.startsWith('/storage/')) {
    return uri;
  }

  if (_isLocalDevHost(uri.host)) {
    return Uri.parse(DevPorts.appUrl).replace(path: uri.path, query: uri.query);
  }

  if (uri.origin == Uri.parse(DevPorts.appUrl).origin) {
    return uri;
  }

  return uri;
}

bool _isLocalDevHost(String host) {
  return host == '127.0.0.1' || host == 'localhost' || host == '10.0.2.2';
}

extension FamilyMediaRefUrl on FamilyMediaRef {
  String? get playableUrl {
    final raw = cdnUrl;
    if (raw == null || raw.isEmpty) return null;
    return resolveMediaUrl(raw);
  }

  bool get isImage => type == 'image';
  bool get isVideo => type == 'video';
  bool get isAudio => type == 'voice' || type == 'audio';
}
