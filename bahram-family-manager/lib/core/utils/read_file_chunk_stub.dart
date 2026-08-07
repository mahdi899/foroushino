import 'dart:typed_data';

Future<Uint8List> readFileChunkImpl(String path, int start, int length) {
  throw UnsupportedError('File chunk reading is not supported on this platform.');
}

Future<int> fileByteLengthImpl(String path) {
  throw UnsupportedError('File length is not supported on this platform.');
}
