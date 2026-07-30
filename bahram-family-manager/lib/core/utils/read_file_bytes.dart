import 'dart:typed_data';

import 'package:cross_file/cross_file.dart';

/// Reads bytes from a local file path or web blob URL produced by `record`.
Future<Uint8List> readFileBytes(String path) => XFile(path).readAsBytes();
