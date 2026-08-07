import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// Persisted voice capture on device (app documents — survives app restarts).
class SavedVoiceRecording {
  const SavedVoiceRecording({
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

/// Local folder for recorded voices (`…/voice_recordings/`).
class VoiceLocalStore {
  VoiceLocalStore._();

  static const recordingsSubdir = 'voice_recordings';

  static Future<Directory?> recordingsDirectory() async {
    if (kIsWeb) return null;
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, recordingsSubdir));
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  /// Writes [bytes] under the recordings folder and returns metadata.
  static Future<SavedVoiceRecording?> save(Uint8List bytes, String filename) async {
    if (kIsWeb || bytes.isEmpty) return null;

    final dir = await recordingsDirectory();
    if (dir == null) return null;

    final safeName = _uniqueFilename(dir, _sanitizeFilename(filename));
    final file = File(p.join(dir.path, safeName));
    await file.writeAsBytes(bytes, flush: true);

    final stat = await file.stat();
    return SavedVoiceRecording(
      filename: safeName,
      absolutePath: file.path,
      savedAt: stat.modified,
      sizeBytes: stat.size,
    );
  }

  /// All recordings in the library folder, newest first.
  static Future<List<SavedVoiceRecording>> listAll() async {
    if (kIsWeb) return [];

    final dir = await recordingsDirectory();
    if (dir == null) return [];

    final entries = <SavedVoiceRecording>[];
    await for (final entity in dir.list(followLinks: false)) {
      if (entity is! File) continue;
      try {
        final stat = await entity.stat();
        if (stat.size <= 0) continue;
        entries.add(
          SavedVoiceRecording(
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

  static Future<Uint8List?> readBytes(SavedVoiceRecording recording) async {
    if (kIsWeb) return null;
    try {
      final file = File(recording.absolutePath);
      if (!await file.exists()) return null;
      return await file.readAsBytes();
    } catch (_) {
      return null;
    }
  }

  static Future<bool> delete(SavedVoiceRecording recording) async {
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

  /// Renames the file on disk. Keeps the original audio extension.
  /// [newName] may be stem-only or include an extension (extension is ignored if different).
  static Future<SavedVoiceRecording?> rename(
    SavedVoiceRecording recording,
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
      return SavedVoiceRecording(
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
    if (base.isEmpty) return 'voice_${DateTime.now().millisecondsSinceEpoch}.wav';
    // Keep letters (incl. Persian), digits, dot, dash, underscore; strip path separators & control chars.
    final cleaned = base
        .replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1F]'), '_')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    return cleaned.isEmpty ? 'voice_${DateTime.now().millisecondsSinceEpoch}.wav' : cleaned;
  }

  static String _uniqueFilename(Directory dir, String filename) {
    if (!File(p.join(dir.path, filename)).existsSync()) return filename;
    final ext = p.extension(filename);
    final stem = p.basenameWithoutExtension(filename);
    return '${stem}_${DateTime.now().millisecondsSinceEpoch}$ext';
  }
}
