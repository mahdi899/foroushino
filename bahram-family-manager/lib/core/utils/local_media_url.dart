import 'dart:typed_data';

import 'local_media_url_stub.dart'
    if (dart.library.html) 'local_media_url_web.dart'
    if (dart.library.io) 'local_media_url_io.dart' as impl;

/// Creates a playable local URL (blob on web, temp file path on IO) from bytes.
Future<String> createLocalMediaUrl(Uint8List bytes, String mimeType, {String? extension}) {
  return impl.createLocalMediaUrl(bytes, mimeType, extension: extension);
}

Future<void> revokeLocalMediaUrl(String? url) => impl.revokeLocalMediaUrl(url);

String guessMediaMimeType(String? filename, String mediaType) {
  final ext = filename?.split('.').last.toLowerCase();
  return switch (ext) {
        'jpg' || 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'mp4' => 'video/mp4',
        'webm' => 'video/webm',
        'mov' => 'video/quicktime',
        'mp3' => 'audio/mpeg',
        'm4a' => 'audio/mp4',
        'aac' => 'audio/aac',
        'wav' => 'audio/wav',
        'ogg' || 'oga' => 'audio/ogg',
        'opus' => 'audio/opus',
        _ => null,
      } ??
      switch (mediaType) {
        'image' => 'image/jpeg',
        'video' => 'video/mp4',
        'voice' || 'audio' => 'audio/mpeg',
        _ => 'application/octet-stream',
      };
}

String? extensionOfFilename(String? filename) {
  if (filename == null || !filename.contains('.')) return null;
  final ext = filename.split('.').last.trim().toLowerCase();
  return ext.isEmpty ? null : ext;
}
