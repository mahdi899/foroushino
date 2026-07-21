import 'dart:typed_data';

Future<String> createLocalMediaUrl(Uint8List bytes, String mimeType, {String? extension}) {
  throw UnsupportedError('Local media preview is not supported on this platform.');
}

Future<void> revokeLocalMediaUrl(String? url) async {}
