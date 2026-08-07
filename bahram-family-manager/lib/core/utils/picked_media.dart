import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'package:bahram_family_manager/core/utils/media_size_guard.dart';
import 'package:bahram_family_manager/core/utils/read_file_bytes.dart';
import 'package:bahram_family_manager/core/utils/read_file_chunk.dart';
import 'package:bahram_family_manager/services/family_manager_service.dart';

/// Resolved local file ready for upload (bytes and/or disk path).
class PickedMediaFile {
  const PickedMediaFile({
    required this.filename,
    required this.size,
    this.bytes,
    this.path,
  });

  final String filename;
  final int size;
  final Uint8List? bytes;
  final String? path;

  bool get hasSource =>
      (bytes != null && bytes!.isNotEmpty) || (path != null && path!.isNotEmpty);
}

/// Result of resolving a [PlatformFile] for upload.
sealed class ResolvePickedMediaResult {}

class ResolvePickedMediaOk extends ResolvePickedMediaResult {
  ResolvePickedMediaOk(this.file);
  final PickedMediaFile file;
}

class ResolvePickedMediaError extends ResolvePickedMediaResult {
  ResolvePickedMediaError(this.message);
  final String message;
}

/// Prefer path on IO (avoid loading huge videos into RAM); bytes required on web.
bool get pickFilesWithData => kIsWeb;

Future<ResolvePickedMediaResult> resolvePlatformFile(
  PlatformFile picked, {
  required String mediaType,
}) async {
  final path = picked.path;
  final inlineBytes = picked.bytes;

  var size = picked.size;
  if (size <= 0 && inlineBytes != null) {
    size = inlineBytes.length;
  }
  if (size <= 0 && path != null && path.isNotEmpty) {
    size = await _fileLength(path) ?? 0;
  }

  if (size > 0 && MediaSizeGuard.isOversize(size, type: mediaType)) {
    return ResolvePickedMediaError(
      MediaSizeGuard.oversizeMessage(size, type: mediaType) ??
          'فایل بیش از حد بزرگ است.',
    );
  }

  if (inlineBytes != null && inlineBytes.isNotEmpty) {
    return ResolvePickedMediaOk(
      PickedMediaFile(
        filename: picked.name,
        size: inlineBytes.length,
        bytes: inlineBytes,
        path: path,
      ),
    );
  }

  if (path != null && path.isNotEmpty) {
    // Video: only preload small files; large ones stream from path in chunks.
    // Image/voice: preload whenever under the type limit (upload needs bytes).
    final preloadLimit = mediaType == 'video'
        ? FamilyManagerService.chunkThresholdBytes
        : MediaSizeGuard.maxBytesFor(mediaType);
    if (size > 0 && size <= preloadLimit) {
      try {
        final bytes = await readFileBytes(path);
        if (bytes.isEmpty) {
          return ResolvePickedMediaError('خواندن فایل «${picked.name}» ناموفق بود.');
        }
        if (MediaSizeGuard.isOversize(bytes.length, type: mediaType)) {
          return ResolvePickedMediaError(
            MediaSizeGuard.oversizeMessage(bytes.length, type: mediaType) ??
                'فایل بیش از حد بزرگ است.',
          );
        }
        return ResolvePickedMediaOk(
          PickedMediaFile(
            filename: picked.name,
            size: bytes.length,
            bytes: bytes,
            path: path,
          ),
        );
      } catch (_) {
        return ResolvePickedMediaError('خواندن فایل «${picked.name}» ناموفق بود.');
      }
    }

    if (size <= 0) {
      return ResolvePickedMediaError('خواندن فایل «${picked.name}» ناموفق بود.');
    }

    if (mediaType != 'video') {
      return ResolvePickedMediaError('خواندن فایل «${picked.name}» ناموفق بود.');
    }

    return ResolvePickedMediaOk(
      PickedMediaFile(
        filename: picked.name,
        size: size,
        path: path,
      ),
    );
  }

  return ResolvePickedMediaError('خواندن فایل «${picked.name}» ناموفق بود.');
}

Future<int?> _fileLength(String path) async {
  try {
    return await fileByteLength(path);
  } catch (_) {
    return null;
  }
}
