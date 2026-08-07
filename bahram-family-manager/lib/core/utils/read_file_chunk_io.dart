import 'dart:io';
import 'dart:typed_data';

Future<Uint8List> readFileChunkImpl(String path, int start, int length) async {
  final raf = await File(path).open(mode: FileMode.read);
  try {
    await raf.setPosition(start);
    final chunk = await raf.read(length);
    return chunk;
  } finally {
    await raf.close();
  }
}

Future<int> fileByteLengthImpl(String path) => File(path).length();
