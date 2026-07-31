import 'dart:math' as math;
import 'dart:typed_data';

/// Lightweight WAV (PCM 16-bit) helpers for trim + gain without native ffmpeg.
class WavAudioEdit {
  WavAudioEdit._();

  static bool isWav(Uint8List bytes) {
    if (bytes.length < 44) return false;
    return bytes[0] == 0x52 &&
        bytes[1] == 0x49 &&
        bytes[2] == 0x46 &&
        bytes[3] == 0x46 &&
        bytes[8] == 0x57 &&
        bytes[9] == 0x41 &&
        bytes[10] == 0x56 &&
        bytes[11] == 0x45;
  }

  static _WavInfo? _parse(Uint8List bytes) {
    if (!isWav(bytes)) return null;

    var offset = 12;
    var audioFormat = 1;
    var channels = 1;
    var sampleRate = 44100;
    var bitsPerSample = 16;
    var dataOffset = -1;
    var dataSize = 0;

    while (offset + 8 <= bytes.length) {
      final id = String.fromCharCodes(bytes.sublist(offset, offset + 4));
      final size = ByteData.sublistView(bytes, offset + 4, offset + 8)
          .getUint32(0, Endian.little);
      final chunkStart = offset + 8;

      if (id == 'fmt ' && chunkStart + 16 <= bytes.length) {
        final fmt = ByteData.sublistView(bytes, chunkStart, chunkStart + 16);
        audioFormat = fmt.getUint16(0, Endian.little);
        channels = fmt.getUint16(2, Endian.little);
        sampleRate = fmt.getUint32(4, Endian.little);
        bitsPerSample = fmt.getUint16(14, Endian.little);
      } else if (id == 'data') {
        dataOffset = chunkStart;
        dataSize = size;
        break;
      }

      offset = chunkStart + size + (size.isOdd ? 1 : 0);
    }

    if (dataOffset < 0 || audioFormat != 1 || bitsPerSample != 16) {
      return null;
    }

    final bytesPerFrame = channels * (bitsPerSample ~/ 8);
    if (bytesPerFrame <= 0) return null;

    final frameCount = dataSize ~/ bytesPerFrame;
    return _WavInfo(
      channels: channels,
      sampleRate: sampleRate,
      bitsPerSample: bitsPerSample,
      dataOffset: dataOffset,
      dataSize: frameCount * bytesPerFrame,
      bytesPerFrame: bytesPerFrame,
      frameCount: frameCount,
      header: Uint8List.fromList(bytes.sublist(0, dataOffset)),
    );
  }

  static Duration? durationOf(Uint8List bytes) {
    final info = _parse(bytes);
    if (info == null || info.sampleRate <= 0) return null;
    return Duration(
      microseconds: (info.frameCount * 1000000) ~/ info.sampleRate,
    );
  }

  /// Normalized peak envelope for waveform painting (0..1).
  static List<double> peaks(Uint8List bytes, {int buckets = 72}) {
    final info = _parse(bytes);
    if (info == null || info.frameCount == 0 || buckets <= 0) {
      return List<double>.filled(buckets.clamp(1, 256), 0.08);
    }

    final pcm = ByteData.sublistView(
      bytes,
      info.dataOffset,
      info.dataOffset + info.dataSize,
    );
    final out = List<double>.filled(buckets, 0);
    final framesPerBucket = math.max(1, info.frameCount ~/ buckets);

    for (var b = 0; b < buckets; b++) {
      final start = b * framesPerBucket;
      final end = math.min(info.frameCount, start + framesPerBucket);
      var peak = 0;
      for (var frame = start; frame < end; frame++) {
        final sampleOffset = frame * info.bytesPerFrame;
        final sample = pcm.getInt16(sampleOffset, Endian.little).abs();
        if (sample > peak) peak = sample;
      }
      out[b] = (peak / 32768).clamp(0.0, 1.0);
    }
    return out;
  }

  /// Trim by ratio (0..1) and apply linear gain, returning a new WAV file.
  static Uint8List process(
    Uint8List bytes, {
    double startRatio = 0,
    double endRatio = 1,
    double gain = 1,
  }) {
    final info = _parse(bytes);
    if (info == null) return bytes;

    final start = startRatio.clamp(0.0, 1.0);
    final end = endRatio.clamp(0.0, 1.0);
    if (end <= start + 0.005) return bytes;

    final startFrame = (info.frameCount * start).floor().clamp(0, info.frameCount);
    final endFrame = (info.frameCount * end).ceil().clamp(0, info.frameCount);
    final frameCount = math.max(0, endFrame - startFrame);
    if (frameCount <= 0) return bytes;

    final outDataSize = frameCount * info.bytesPerFrame;
    final pcmIn = ByteData.sublistView(
      bytes,
      info.dataOffset,
      info.dataOffset + info.dataSize,
    );
    final pcmOut = ByteData(outDataSize);
    final safeGain = gain.clamp(0.5, 3.0);

    for (var frame = 0; frame < frameCount; frame++) {
      final src = (startFrame + frame) * info.bytesPerFrame;
      final dst = frame * info.bytesPerFrame;
      for (var ch = 0; ch < info.channels; ch++) {
        final sample = pcmIn.getInt16(src + ch * 2, Endian.little);
        final boosted = (sample * safeGain).round().clamp(-32768, 32767);
        pcmOut.setInt16(dst + ch * 2, boosted, Endian.little);
      }
    }

    return _rebuild(info.header, pcmOut.buffer.asUint8List());
  }
}

class _WavInfo {
  const _WavInfo({
    required this.channels,
    required this.sampleRate,
    required this.bitsPerSample,
    required this.dataOffset,
    required this.dataSize,
    required this.bytesPerFrame,
    required this.frameCount,
    required this.header,
  });

  final int channels;
  final int sampleRate;
  final int bitsPerSample;
  final int dataOffset;
  final int dataSize;
  final int bytesPerFrame;
  final int frameCount;
  final Uint8List header;
}

Uint8List _rebuild(Uint8List header, Uint8List pcm) {
  final out = Uint8List(header.length + pcm.length);
  out.setRange(0, header.length, header);
  out.setRange(header.length, out.length, pcm);

  final view = ByteData.sublistView(out);
  // RIFF size = file size - 8
  view.setUint32(4, out.length - 8, Endian.little);

  // Patch data chunk size (last 4 bytes of header before pcm).
  if (header.length >= 8) {
    view.setUint32(header.length - 4, pcm.length, Endian.little);
  }
  return out;
}
