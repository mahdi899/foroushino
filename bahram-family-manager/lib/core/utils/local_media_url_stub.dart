import 'dart:typed_data';

Future<String> createLocalMediaUrlImpl(Uint8List bytes, String mimeType, {String? extension}) {
  throw UnsupportedError('Local media preview is not supported on this platform.');
}

Future<void> revokeLocalMediaUrlImpl(String? url) async {}
