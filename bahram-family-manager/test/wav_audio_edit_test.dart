import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:bahram_family_manager/core/utils/wav_audio_edit.dart';

Uint8List _buildWav({
  required int sampleRate,
  required int channels,
  required int pcmBytes,
  int? headerDataSize,
}) {
  final bitsPerSample = 16;
  final byteRate = sampleRate * channels * bitsPerSample ~/ 8;
  final blockAlign = channels * bitsPerSample ~/ 8;
  final declaredDataSize = headerDataSize ?? pcmBytes;
  final chunkSize = 36 + declaredDataSize;
  final fileSize = 8 + chunkSize;

  final header = ByteData(44);
  header.setUint8(0, 0x52); // RIFF
  header.setUint8(1, 0x49);
  header.setUint8(2, 0x46);
  header.setUint8(3, 0x46);
  header.setUint32(4, fileSize, Endian.little);
  header.setUint8(8, 0x57); // WAVE
  header.setUint8(9, 0x41);
  header.setUint8(10, 0x56);
  header.setUint8(11, 0x45);
  header.setUint8(12, 0x66); // fmt
  header.setUint8(13, 0x6d);
  header.setUint8(14, 0x74);
  header.setUint8(15, 0x20);
  header.setUint32(16, 16, Endian.little);
  header.setUint16(20, 1, Endian.little); // PCM
  header.setUint16(22, channels, Endian.little);
  header.setUint32(24, sampleRate, Endian.little);
  header.setUint32(28, byteRate, Endian.little);
  header.setUint16(32, blockAlign, Endian.little);
  header.setUint16(34, bitsPerSample, Endian.little);
  header.setUint8(36, 0x64); // data
  header.setUint8(37, 0x61);
  header.setUint8(38, 0x74);
  header.setUint8(39, 0x61);
  header.setUint32(40, declaredDataSize, Endian.little);

  final pcm = Uint8List(pcmBytes);
  final out = Uint8List(header.lengthInBytes + pcm.length);
  out.setRange(0, header.lengthInBytes, header.buffer.asUint8List());
  out.setRange(header.lengthInBytes, out.length, pcm);
  return out;
}

void main() {
  test('durationOf uses actual PCM bytes when header data size is understated', () {
    const sampleRate = 44100;
    const channels = 1;
    const seconds = 12;
    final pcmBytes = sampleRate * channels * 2 * seconds;
    final understated = pcmBytes ~/ 6; // ~2 seconds in header

    final wav = _buildWav(
      sampleRate: sampleRate,
      channels: channels,
      pcmBytes: pcmBytes,
      headerDataSize: understated,
    );

    final duration = WavAudioEdit.durationOf(wav);
    expect(duration, isNotNull);
    expect(duration!.inSeconds, seconds);
  });
}
