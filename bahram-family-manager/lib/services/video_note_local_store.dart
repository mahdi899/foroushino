import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Persisted circular video-note capture (app documents — survives restarts).
class SavedVideoNoteRecording {
  const SavedVideoNoteRecording({
    required this.filename,
    required this.absolutePath,
    required this.savedAt,
    required this.sizeBytes,
  });

  final String filename;
  final String absolutePath;
  final DateTime savedAt;
  final int sizeBytes;
}

/// Local folder for circular video notes (`…/video_note_recordings/`).
class VideoNoteLocalStore {
  VideoNoteLocalStore._();

  static const recordingsSubdir = 'video_note_recordings';

  static Future<Directory?> recordingsDirectory() async {
    if (kIsWeb) return null;
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, recordingsSubdir));
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  static Future<SavedVideoNoteRecording?> save(Uint8List bytes, String filename) async {
    if (kIsWeb || bytes.isEmpty) return null;

    final dir = await recordingsDirectory();
    if (dir == null) return null;

    final safeName = _uniqueFilename(dir, _sanitizeFilename(filename));
    final file = File(p.join(dir.path, safeName));
    await file.writeAsBytes(bytes, flush: true);

    final stat = await file.stat();
    return SavedVideoNoteRecording(
      filename: safeName,
      absolutePath: file.path,
      savedAt: stat.modified,
      sizeBytes: stat.size,
    );
  }

  /// Prefer copying an existing file into the library (avoids re-encoding large clips).
  static Future<SavedVideoNoteRecording?> saveFromPath(String sourcePath, {String? filename}) async {
    if (kIsWeb) return null;
    final source = File(sourcePath);
    if (!await source.exists()) return null;

    final dir = await recordingsDirectory();
    if (dir == null) return null;

    final preferred = filename?.trim().isNotEmpty == true
        ? filename!.trim()
        : p.basename(sourcePath);
    final safeName = _uniqueFilename(dir, _sanitizeFilename(preferred));
    final target = p.join(dir.path, safeName);

    // If already inside the library folder under the same path, just wrap metadata.
    if (p.equals(sourcePath, target)) {
      final stat = await source.stat();
      return SavedVideoNoteRecording(
        filename: safeName,
        absolutePath: source.path,
        savedAt: stat.modified,
        sizeBytes: stat.size,
      );
    }

    await source.copy(target);
    final file = File(target);
    final stat = await file.stat();
    return SavedVideoNoteRecording(
      filename: safeName,
      absolutePath: file.path,
      savedAt: stat.modified,
      sizeBytes: stat.size,
    );
  }

  static Future<List<SavedVideoNoteRecording>> listAll() async {
    if (kIsWeb) return [];

    final dir = await recordingsDirectory();
    if (dir == null) return [];

    final entries = <SavedVideoNoteRecording>[];
    await for (final entity in dir.list(followLinks: false)) {
      if (entity is! File) continue;
      try {
        final stat = await entity.stat();
        if (stat.size <= 0) continue;
        entries.add(
          SavedVideoNoteRecording(
            filename: p.basename(entity.path),
            absolutePath: entity.path,
            savedAt: stat.modified,
            sizeBytes: stat.size,
          ),
        );
      } catch (_) {}
    }

    entries.sort((a, b) => b.savedAt.compareTo(a.savedAt));
    return entries;
  }

  static Future<Uint8List?> readBytes(SavedVideoNoteRecording recording) async {
    if (kIsWeb) return null;
    try {
      final file = File(recording.absolutePath);
      if (!await file.exists()) return null;
      return await file.readAsBytes();
    } catch (_) {
      return null;
    }
  }

  static Future<bool> delete(SavedVideoNoteRecording recording) async {
    if (kIsWeb) return false;
    try {
      final file = File(recording.absolutePath);
      if (!await file.exists()) return true;
      await file.delete();
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<SavedVideoNoteRecording?> rename(
    SavedVideoNoteRecording recording,
    String newName,
  ) async {
    if (kIsWeb) return null;

    final dir = await recordingsDirectory();
    if (dir == null) return null;

    final file = File(recording.absolutePath);
    if (!await file.exists()) return null;

    final ext = p.extension(recording.filename);
    var input = newName.trim();
    if (input.isEmpty) return null;

    final inputExt = p.extension(input);
    if (inputExt.isEmpty) {
      input = '$input$ext';
    } else {
      input = '${p.basenameWithoutExtension(input)}$ext';
    }

    final safeName = _sanitizeFilename(input);
    if (safeName == recording.filename) return recording;

    final targetName = _uniqueFilename(dir, safeName);
    try {
      final renamed = await file.rename(p.join(dir.path, targetName));
      final stat = await renamed.stat();
      return SavedVideoNoteRecording(
        filename: targetName,
        absolutePath: renamed.path,
        savedAt: stat.modified,
        sizeBytes: stat.size,
      );
    } catch (_) {
      return null;
    }
  }

  static String _sanitizeFilename(String filename) {
    final base = p.basename(filename.trim());
    if (base.isEmpty) return 'video_note_${DateTime.now().millisecondsSinceEpoch}.mp4';
    final cleaned = base
        .replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1F]'), '_')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    if (cleaned.isEmpty) return 'video_note_${DateTime.now().millisecondsSinceEpoch}.mp4';
    if (p.extension(cleaned).isEmpty) return '$cleaned.mp4';
    return cleaned;
  }

  static String _uniqueFilename(Directory dir, String filename) {
    if (!File(p.join(dir.path, filename)).existsSync()) return filename;
    final ext = p.extension(filename);
    final stem = p.basenameWithoutExtension(filename);
    return '${stem}_${DateTime.now().millisecondsSinceEpoch}$ext';
  }
}
