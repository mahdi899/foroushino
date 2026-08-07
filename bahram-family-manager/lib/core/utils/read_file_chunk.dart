import 'dart:typed_data';

import 'read_file_chunk_stub.dart'
    if (dart.library.html) 'read_file_chunk_web.dart'
    if (dart.library.io) 'read_file_chunk_io.dart';

/// Reads [length] bytes starting at [start] from a local file path.
Future<Uint8List> readFileChunk(String path, int start, int length) =>
    readFileChunkImpl(path, start, length);

Future<int> fileByteLength(String path) => fileByteLengthImpl(path);
