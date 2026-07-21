import 'dart:io';
import 'dart:typed_data';

Future<String> createLocalMediaUrlImpl(Uint8List bytes, String mimeType, {String? extension}) async {
  final ext = (extension != null && extension.isNotEmpty)
      ? extension
      : switch (mimeType) {
          'image/png' => 'png',
          'image/webp' => 'webp',
          'image/gif' => 'gif',
          'video/webm' => 'webm',
          'video/quicktime' => 'mov',
          'audio/mpeg' => 'mp3',
          'audio/mp4' => 'm4a',
          'audio/wav' => 'wav',
          'audio/ogg' => 'ogg',
          _ when mimeType.startsWith('image/') => 'jpg',
          _ when mimeType.startsWith('video/') => 'mp4',
          _ when mimeType.startsWith('audio/') => 'mp3',
          _ => 'bin',
        };

  final file = File(
    '${Directory.systemTemp.path}${Platform.pathSeparator}family_preview_${DateTime.now().microsecondsSinceEpoch}.$ext',
  );
  await file.writeAsBytes(bytes, flush: true);
  return file.path;
}

Future<void> revokeLocalMediaUrlImpl(String? url) async {
  if (url == null || url.isEmpty) return;
  if (url.startsWith('blob:') || url.startsWith('http')) return;
  try {
    final file = File(url);
    if (await file.exists()) {
      await file.delete();
    }
  } catch (_) {}
}
