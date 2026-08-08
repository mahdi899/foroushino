import 'package:flutter/foundation.dart';

import 'package:bahram_family_manager/config/app_config.dart';
import 'package:bahram_family_manager/config/dev_ports.dart';
import 'package:bahram_family_manager/models/models.dart';

/// Resolves media URLs from API (`cdn_url`, `url`) to absolute network URLs.
///
/// On Android/iOS/desktop, loopback hosts from local Laravel
/// (`http://localhost:3000/storage/…`, `127.0.0.1`, …) are rewritten to the
/// API origin (`10.0.2.2:8010` on the emulator) so ExoPlayer never tries to
/// open the machine's Next.js port on the device itself.
String? resolveMediaUrl(String? raw) {
  if (raw == null || raw.isEmpty) return null;

  final parsed = Uri.tryParse(raw);
  if (parsed != null && parsed.hasScheme) {
    if (!kIsWeb) {
      return _rewriteLoopbackForNative(parsed).toString();
    }
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

/// Native players cannot reach the developer PC's `localhost` / Next `:3000`.
Uri _rewriteLoopbackForNative(Uri uri) {
  if (!_isLocalDevHost(uri.host)) return uri;

  final path = uri.path.isEmpty ? '/' : uri.path;
  final apiBase = AppConfig.apiBaseUrl;
  final origin = Uri.parse(apiBase.replaceFirst(RegExp(r'/api/v1/?$'), ''));
  return origin.replace(
    path: path,
    query: uri.query.isEmpty ? null : uri.query,
  );
}

Uri _rewriteForWeb(Uri uri) {
  if (!kIsWeb) return uri;

  // Family manager on localhost: CDN has no CORS — load via dev proxy /storage/…
  if (uri.host == 'cdn.rostami.app' && uri.path.startsWith('/media/family/')) {
    final page = Uri.base;
    if (_isLocalDevHost(page.host)) {
      return Uri.parse(DevPorts.appUrl).replace(
        path: '/storage${uri.path}',
        query: uri.query.isEmpty ? null : uri.query,
      );
    }
    if (page.host.endsWith('rostami.club') ||
        page.host == 'bahram.club' ||
        page.host == 'www.bahram.club') {
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
