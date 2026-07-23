import 'dart:typed_data';
import 'dart:ui' as ui;

/// Reads pixel dimensions from encoded image bytes (before upload).
Future<(int width, int height)?> readImageDimensions(Uint8List bytes) async {
  try {
    final codec = await ui.instantiateImageCodec(bytes);
    final frame = await codec.getNextFrame();
    final image = frame.image;
    final width = image.width;
    final height = image.height;
    image.dispose();
    return (width, height);
  } catch (_) {
    return null;
  }
}
