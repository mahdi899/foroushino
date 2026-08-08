import 'dart:typed_data';

import 'package:flutter/material.dart';

class VideoNoteRecordingResult {
  const VideoNoteRecordingResult({
    required this.bytes,
    required this.filename,
    this.localPath,
    this.mimeType = 'video/webm',
  });

  final Uint8List bytes;
  final String filename;
  final String? localPath;
  final String mimeType;
}

/// Stub — real implementations live in web/io panels.
class VideoNoteRecorderPanel extends StatelessWidget {
  const VideoNoteRecorderPanel({
    super.key,
    required this.onRecorded,
    this.onError,
    this.enabled = true,
  });

  final ValueChanged<VideoNoteRecordingResult> onRecorded;
  final ValueChanged<String>? onError;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}
